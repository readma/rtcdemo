
var myEasyrtcId = "";
var haveSelfVideo = false;

var predefinedUsers = {"id1" : "User1", "id2": "User2", "id3" : "User3"};

$(document).ready(function(){
	$("#loginModal").modal();
	installUIEventListeners();
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

function installUIEventListeners()
{
    $("#loginForm").submit(function(event){
		connect();
		event.preventDefault();
	});
}

function getUserName(userId)
{
	return predefinedUsers[userId];
}

function getKeyByValue(object, value) {
  return Object.keys(object).find(key => object[key] === value);
}

function connect() {
	$("#loginBtn").button("loading");
	easyrtc.setRoomOccupantListener(updateRoomOccupants);
	easyrtc.setUsername($("#userName").value);
	easyrtc.connect("DemoChatApp", loginSuccess, loginFailure);
}

function loginSuccess(easyrtcid) {
	$("#loginModal").modal("hide");
	$("#loginBtn").button("reset");
	$("#videos").removeClass('hide').addClass('show');
	//$("#userPanel").addClass('show');
    //enable("disconnectButton");
    //enable('otherClients');
    myEasyrtcId = easyrtcid;
    //document.getElementById("iam").innerHTML = "已连接为 " + easyrtc.idToName(easyrtcid);
	
}


function loginFailure(errorCode, message) {
	$("#loginBtn").button("reset");
    easyrtc.showError(errorCode, message);
}

function initAudioDevices()
{
      easyrtc.getAudioSinkList( function(list) {
         for(let ele of list ) {
             addSinkButton(ele.label, ele.deviceId);
         }
      });
}

function addSinkButton(label, deviceId){
   let button = document.createElement("button");
   button.innerText = label?label:deviceId;
   button.onclick = function() {
      easyrtc.setAudioOutput( document.getElementById("callerVideo"), deviceId);
   }
   document.getElementById("audioSinkButtons").appendChild(button);
}


function hangup() {
    easyrtc.hangupAll();
    disable('hangupButton');
}

function clearConnectList() {
    var otherClientDiv = document.getElementById('otherClients');
    while (otherClientDiv.hasChildNodes()) {
        otherClientDiv.removeChild(otherClientDiv.lastChild);
    }
}


function updateRoomOccupants (roomName, occupants, isPrimary) {
	/*
    clearConnectList();
    var otherClientDiv = document.getElementById('otherClients');
    for(var easyrtcid in occupants) {
        var button = document.createElement('button');
        button.onclick = function(easyrtcid) {
            return function() {
                performCall(easyrtcid);
            };
        }(easyrtcid);

        var label = document.createTextNode("呼叫 " + easyrtc.idToName(easyrtcid));
        button.appendChild(label);
        otherClientDiv.appendChild(button);
    }
	*/
}


function setUpMirror() {
    if( !haveSelfVideo) {
        var selfVideo = document.getElementById("selfVideo");
        easyrtc.setVideoObjectSrc(selfVideo, easyrtc.getLocalStream());
        selfVideo.muted = true;
        haveSelfVideo = true;
    }
}

function performCall(otherEasyrtcid) {
	document.getElementById('callerTone').play();
    easyrtc.hangupAll();
    var acceptedCB = function(accepted, easyrtcid) {
        if( !accepted ) {
            easyrtc.showError("CALL-REJECTEd", "Sorry, your call to " + easyrtc.idToName(easyrtcid) + " was rejected");
            enable('otherClients');
        }
		document.getElementById('callerTone').pause();
    };

    var successCB = function() {
        if( easyrtc.getLocalStream()) {
            setUpMirror();
        }
        enable('hangupButton');
		document.getElementById('callerTone').pause();
    };
    var failureCB = function() {
        enable('otherClients');
		document.getElementById('callerTone').pause();
    };
    easyrtc.call(otherEasyrtcid, successCB, failureCB, acceptedCB);
    enable('hangupButton');
}



function disconnect() {
  easyrtc.disconnect();			  
  document.getElementById("iam").innerHTML = "logged out";
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
    enable("hangupButton");
});



easyrtc.setOnStreamClosed( function (easyrtcid) {
    easyrtc.setVideoObjectSrc(document.getElementById('callerVideo'), "");
    disable("hangupButton");
});


var callerPending = null;

easyrtc.setCallCancelled( function(easyrtcid){
    if( easyrtcid === callerPending) {
        document.getElementById('acceptCallBox').style.display = "none";
        callerPending = false;
    }
});


easyrtc.setAcceptChecker(function(easyrtcid, callback) {
	document.getElementById('msgTone').play();
    document.getElementById('acceptCallBox').style.display = "block";
    callerPending = easyrtcid;
    if( easyrtc.getConnectionCount() > 0 ) {
        document.getElementById('acceptCallLabel').innerHTML = "是否挂断当前通话并接受 " + easyrtc.idToName(easyrtcid) + " 的新请求?";
    }
    else {
        document.getElementById('acceptCallLabel').innerHTML = "是否接受来自 " + easyrtc.idToName(easyrtcid) + " 的视频请求?";
    }
    var acceptTheCall = function(wasAccepted) {
        document.getElementById('acceptCallBox').style.display = "none";
        if( wasAccepted && easyrtc.getConnectionCount() > 0 ) {
            easyrtc.hangupAll();
        }
        callback(wasAccepted);
        callerPending = null;
		document.getElementById('msgTone').pause();
    };
    document.getElementById("callAcceptButton").onclick = function() {
        acceptTheCall(true);
    };
    document.getElementById("callRejectButton").onclick =function() {
        acceptTheCall(false);
    };
} );

function disable(domId) {
    document.getElementById(domId).disabled = "disabled";
}


function enable(domId) {
    document.getElementById(domId).disabled = "";
}

function closeErrorDialog()
{
	var errorDiv = document.getElementById('easyrtcErrorDialog');
	document.getElementById('easyrtcErrorDialog_body').innerHTML = "";
	errorDiv.style.display = "none";
}

