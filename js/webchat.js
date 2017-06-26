
var myEasyrtcId = "";
var haveSelfVideo = false;
var waitingResponseTimeout;

$(document).ready(function(){
    $("#loginForm").submit(function (event) {
        connect();
        event.preventDefault();
    });
    $("#loginModal").modal();
	initEasyRtc();
});

function initEasyRtc()
{
	if(document.location.hostname == "localhost"){
		easyrtc.setSocketUrl(":8080");
	}
	else{
		easyrtc.setSocketUrl(":808");
	}
}

function getKeyByValue(object, value) {
  return Object.keys(object).find(key => object[key] === value);
}

function connect() {
	$("#loginBtn").button("loading");
	easyrtc.setRoomOccupantListener(updateRoomOccupants);
	easyrtc.setUsername($("#userName").val());
	easyrtc.connect("DemoChatApp", loginSuccess, loginFailure);
}

function loginSuccess(easyrtcid) {
	$("#loginModal").modal("hide");
	$("#loginBtn").button("reset");
	$("#videoContainer").removeClass('hide').addClass('show');
	updateConnectionInfo(easyrtcid);
	
}


function loginFailure(errorCode, message) {
	$("#loginBtn").button("reset");
    easyrtc.showError(errorCode, message);
}

function initAudioDevices() {
      easyrtc.getAudioSinkList( function(list) {
         for(let ele of list ) {
             addSinkButton(ele.label, ele.deviceId);
         }
      });
}

function updateConnectionInfo(easyrtcid)
{
    myEasyrtcId = easyrtcid;
    $("#connectionInfo").text(easyrtcid ? ("已连接为 " + easyrtc.idToName(easyrtcid)) : "已断开连接");
}

function addSinkButton(label, deviceId){
   let button = document.createElement("button");
   button.innerText = label?label:deviceId;
   button.onclick = function() {
      easyrtc.setAudioOutput( document.getElementById("callerVideo"), deviceId);
   }
   document.getElementById("audioSinkButtons").appendChild(button);
}


function hangup(easyrtcid) {
	if(easyrtcid)
	{
		easyrtc.hangup(easyrtcid);
	}
	else
	{
		easyrtc.hangupAll();
	}
}

function clearConnectList() {
    var otherClientDiv = document.getElementById('otherClients');
    while (otherClientDiv.hasChildNodes()) {
        otherClientDiv.removeChild(otherClientDiv.lastChild);
    }
}


function updateRoomOccupants (roomName, occupants, isPrimary) {
	$("#userList").empty();
    for(var easyrtcid in occupants) {
		var html = "<li class='list-group-item'>";
		html += easyrtc.idToName(easyrtcid);
		html += "&nbsp;<span id='talkingTo" + easyrtcid + "' class='hide'>[视频中]</span>";
		html += "<button class='btn btn-primary btn-md badge' onclick='performCall(\"";
		html += easyrtcid;
		html += "\")'>呼叫</button>"
		html += "<button class='btn btn-primary btn-md badge' onclick='hangup(\"";
		html += easyrtcid;
		html += "\")'>挂断</button></li>"
		$("#userList").append(html);
    }
}

function showAlert(msg, title) {
	var prom = ezBSAlert({
		headerText: title ? "提示信息" : title,
		messageText: msg,
		alertType: "info"
    }).done(function (e) {
    });
}

function closeAlertDialog(followedFunc) {
	if ($("#ezAlerts").length)
	{
		$("#ezAlerts").modal("hide");
		setTimeout(closeAlertDialog, 50, followedFunc);
	}
	else if(followedFunc)
	{
		followedFunc();
	}
}

function setUpMirror() {
    if( !haveSelfVideo) {
        var selfVideo = document.getElementById("selfVideo");
        easyrtc.setVideoObjectSrc(selfVideo, easyrtc.getLocalStream());
        selfVideo.muted = true;
        haveSelfVideo = true;
    }
}

function performCall(easyrtcid) {
    $('#callerTone')[0].play();
	
	ezBSAlert({
		headerText: "呼叫中",
		messageText: "正在呼叫 " + easyrtc.idToName(easyrtcid),
		okButtonText: "取消",
		alertType: "info"
    }).done(function(e) {
		if(e) {
            $('#callerTone')[0].pause();
			easyrtc.hangupAll();
		}
    });
	
    easyrtc.hangupAll();
    var acceptedCB = function (accepted, easyrtcid) {
        cleanUpCalling();
        if( !accepted ) {
            showAlert(easyrtc.idToName(easyrtcid) + " 拒绝了视频请求！");
        }
    };

    var successCB = function () {
        cleanUpCalling();
        if( easyrtc.getLocalStream()) {
            setUpMirror();
        }
    };
    var failureCB = function () {
        cleanUpCalling();
		showAlert("请求失败！");
    };
	
    easyrtc.call(easyrtcid, successCB, failureCB, acceptedCB);
	
	waitingResponseTimeout = setTimeout(function(){ closeAlertDialog(function(){showAlert("对方无响应，已挂断本次请求！");})}, 30000);
}

function cleanUpCalling()
{
    if (waitingResponseTimeout) {
        waitingResponseTimeout = 0;
        clearTimeout(waitingResponseTimeout);
    }
    closeAlertDialog();
    $('#callerTone')[0].pause();
}

function disconnect() {
	easyrtc.disconnect();
	updateConnectionInfo("");
  enable("connectButton");
  disable("disconnectButton"); 
  easyrtc.clearMediaStream( document.getElementById('selfVideo'));
  easyrtc.setVideoObjectSrc(document.getElementById("selfVideo"),"");
  easyrtc.closeLocalMediaStream();
  easyrtc.setRoomOccupantListener( function(){});  
  clearConnectList();
} 


easyrtc.setStreamAcceptor( function(easyrtcid, stream) {
    setUpMirror();
    var video = document.getElementById('callerVideo');
    easyrtc.setVideoObjectSrc(video,stream);
	$("#talkingTo" + easyrtcid).removeClass("hide");
});



easyrtc.setOnStreamClosed( function (easyrtcid) {
    easyrtc.setVideoObjectSrc(document.getElementById('callerVideo'), "");
});


var callerPending = null;

easyrtc.setCallCancelled( function(easyrtcid){
    if( easyrtcid === callerPending) {
        closeAlertDialog();
        callerPending = false;
    }
});


easyrtc.setAcceptChecker(function(easyrtcid, callback) {
	var audio = $('#callerTone')[0];
	audio.play();
    callerPending = easyrtcid;
	var msg = easyrtc.getConnectionCount() > 0 ? ("是否挂断当前通话并接受 " + easyrtc.idToName(easyrtcid) + " 的视频请求?") : ("是否接受来自 " + easyrtc.idToName(easyrtcid) + " 的视频请求?");

    var acceptTheCall = function(wasAccepted) {
		audio.pause();
        closeAlertDialog();
        if( wasAccepted && easyrtc.getConnectionCount() > 0 ) {
            easyrtc.hangupAll();
        }
        callback(wasAccepted);
        callerPending = null;
    };
	
	ezBSAlert({
      type: "confirm",
      messageText: msg,
      headerText: "视频请求",
      alertType: "primary"
    }).done(function (e) {
		acceptTheCall(e);
    });
});

//third party functions
function ezBSAlert (options) {
	var deferredObject = $.Deferred();
	var defaults = {
		type: "alert", //alert, prompt,confirm 
		modalSize: 'modal-sm', //modal-sm, modal-lg
		okButtonText: '确定',
		cancelButtonText: '取消',
		yesButtonText: '是',
		noButtonText: '否',
		headerText: '标题',
		messageText: '消息',
		alertType: 'default', //default, primary, success, info, warning, danger
		inputFieldType: 'text', //could ask for number,email,etc
	}
	$.extend(defaults, options);
  
	var _show = function(){
		var headClass = "navbar-default";
		switch (defaults.alertType) {
			case "primary":
				headClass = "alert-primary";
				break;
			case "success":
				headClass = "alert-success";
				break;
			case "info":
				headClass = "alert-info";
				break;
			case "warning":
				headClass = "alert-warning";
				break;
			case "danger":
				headClass = "alert-danger";
				break;
        }
		$('BODY').append(
			'<div id="ezAlerts" class="modal fade">' +
			'<div class="modal-dialog" class="' + defaults.modalSize + '">' +
			'<div class="modal-content">' +
			'<div id="ezAlerts-header" class="modal-header ' + headClass + '">' +
			//'<button id="close-button" type="button" class="close" data-dismiss="modal"><span aria-hidden="true">×</span><span class="sr-only">Close</span></button>' +
			'<h4 id="ezAlerts-title" class="modal-title">Modal title</h4>' +
			'</div>' +
			'<div id="ezAlerts-body" class="modal-body">' +
			'<div id="ezAlerts-message" ></div>' +
			'</div>' +
			'<div id="ezAlerts-footer" class="modal-footer">' +
			'</div>' +
			'</div>' +
			'</div>' +
			'</div>'
		);

		$('.modal-header').css({
			'padding': '15px 15px',
			'-webkit-border-top-left-radius': '5px',
			'-webkit-border-top-right-radius': '5px',
			'-moz-border-radius-topleft': '5px',
			'-moz-border-radius-topright': '5px',
			'border-top-left-radius': '5px',
			'border-top-right-radius': '5px'
		});
    
		$('#ezAlerts-title').text(defaults.headerText);
		$('#ezAlerts-message').html(defaults.messageText);

		var keyb = "false", backd = "static";
		var calbackParam = "";
		switch (defaults.type) {
			case 'alert':
				keyb = "true";
				backd = "true";
				$('#ezAlerts-footer').html('<button class="btn btn-' + defaults.alertType + '">' + defaults.okButtonText + '</button>').on('click', ".btn", function () {
					calbackParam = true;
					$('#ezAlerts').modal('hide');
				});
				break;
			case 'confirm':
				var btnhtml = '<button id="ezok-btn" class="btn btn-primary">' + defaults.yesButtonText + '</button>';
				if (defaults.noButtonText && defaults.noButtonText.length > 0) {
					btnhtml += '<button id="ezclose-btn" class="btn btn-default">' + defaults.noButtonText + '</button>';
				}
				$('#ezAlerts-footer').html(btnhtml).on('click', 'button', function (e) {
						if (e.target.id === 'ezok-btn') {
							calbackParam = true;
							$('#ezAlerts').modal('hide');
						} else if (e.target.id === 'ezclose-btn') {
							calbackParam = false;
							$('#ezAlerts').modal('hide');
						}
					});
				break;
			case 'prompt':
				$('#ezAlerts-message').html(defaults.messageText + '<br /><br /><div class="form-group"><input type="' + defaults.inputFieldType + '" class="form-control" id="prompt" /></div>');
				$('#ezAlerts-footer').html('<button class="btn btn-primary">' + defaults.okButtonText + '</button>').on('click', ".btn", function () {
					calbackParam = $('#prompt').val();
					$('#ezAlerts').modal('hide');
				});
				break;
		}
   
		$('#ezAlerts').modal({ 
          show: false, 
          backdrop: backd, 
          keyboard: keyb 
        }).on('hidden.bs.modal', function (e) {
			$('#ezAlerts').remove();
			deferredObject.resolve(calbackParam);
		}).on('shown.bs.modal', function (e) {
			if ($('#prompt').length > 0) {
				$('#prompt').focus();
			}
		}).modal('show');
	}
	
  _show();
  return deferredObject.promise();    
}

//Samples:
/*
$(document).ready(function(){
  $("#btnAlert").on("click", function(){  	
    var prom = ezBSAlert({
      messageText: "hello world",
      alertType: "danger"
    }).done(function (e) {
      $("body").append('<div>Callback from alert</div>');
    });
  });   
  
  $("#btnConfirm").on("click", function(){  	
    ezBSAlert({
      type: "confirm",
      messageText: "hello world",
      alertType: "info"
    }).done(function (e) {
      $("body").append('<div>Callback from confirm ' + e + '</div>');
    });
  });   

  $("#btnPrompt").on("click", function(){  	
    ezBSAlert({
      type: "prompt",
      messageText: "Enter Something",
      alertType: "primary"
    }).done(function (e) {
      ezBSAlert({
        messageText: "You entered: " + e,
        alertType: "success"
      });
    });
  });   
  
});
*/
