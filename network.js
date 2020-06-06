

var configuration = {
    "iceServers": [
        {
            "urls": ["turn:106.14.191.21:3478"],
            "username": "Sixeco",
            "credential": "Sixeco@123"

        },
        {
            "urls": [
                "stun:106.14.191.21:3478"
            ]
        },
    ],
};



function getQueryVariable(variable)
{
    var query = window.location.search.substring(1);
    var vars = query.split("&");
    for (var i=0;i<vars.length;i++) {
        var pair = vars[i].split("=");
        if(pair[0] == variable){return pair[1];}
    }
    return(false);
}

var  roomId=getQueryVariable("roomId");
var  userId=getQueryVariable("userId");
var videoEle=document.getElementById("localVideo");
var remoteEle=document.getElementById("remoteVideo");

/**
 *
 * 创建一个RTCPeerConnection
 * 这个是通讯的核心
 * @type {RTCPeerConnection}
 */
myConnect=new RTCPeerConnection(configuration,{optional: [{RtpDataChannels: true}]});

dataChannel = myConnect.createDataChannel("channel1", {reliable:true});
/**
 *
 * websocket 是沟通双飞SDP以及公网IP的作用
 * @type {WebSocket}
 */
var websocket=new WebSocket("wss://redtb-test.sixeco.com/api/v1.0/redt_b_ws/customerService/"+roomId+"/"+userId+"");

websocket.onclose=function (evt) {
    console.log("连接关闭");
}

websocket.onopen=function (evt) {
    console.log("连接上了,开始初始化");
    startInit();
}


websocket.onmessage=function (evt) {




    console.log("recv"+evt.data.toString());
    var recvData={};
    try{
        recvData=JSON.parse(evt.data);
    }catch (e){
        console.log(e.toString())
        return;
    }


    if(!recvData.type)
    {
        return;
    }

    switch (recvData.type){


        case "offer":

            handleOnOff(recvData.data);
            break;
        case "answer":
            handleOnAnswer(recvData.data);
            break;

        case "candidate":
            handleCandidate(recvData.data);
            break;


    }


}



function handleOnOff(remoteSdp) {



    setRemoteSdp(remoteSdp);
    myConnect.createAnswer(function (sdp) {
        sendTextMsg({"type":"answer","data":sdp});
        setLocalSdp(sdp);
    },function (error) {
        console.log("获取answer-SDP出错"+error.toString())
    });

}
function handleOnAnswer(remoteSdp) {
    setRemoteSdp(remoteSdp);
}


function setLocalSdp(sdp){

    myConnect.setLocalDescription(sdp,
        function (success) {
            console.log("设置本地sdp成功")
        }, function (error) {
            console.log("设置本地sdp出错")
        });
}


function setRemoteSdp(sdp){

    myConnect.setRemoteDescription(new RTCSessionDescription(sdp),
        function (success) {
            console.log("设置本地sdp成功")
        }, function (error) {
            console.log("设置本地sdp出错")
        });
}
/**
 * send smg to server
 * @param obj
 */
function sendTextMsg(obj) {
    websocket.send(JSON.stringify(obj))
}











function  startInit(){


    navigator.getUserMedia({ video: true, audio: true },function (stream){
        myConnect.addStream(stream);
        videoEle.srcObject=stream;



        myConnect.createOffer(function (sdp) {
            console.log("获取到sdp");
            sendTextMsg({type:"offer","data":sdp});
            setLocalSdp(sdp)

        },function (error) {

            console.log("获取sdp出错");
            console.log("error"+error)
        });


    },function (error) {
        console.log("获取设备出错了"+error);
    });

    myConnect.onicecandidate=function (evt) {

        sendTextMsg({"type":"candidate","data":evt.candidate});
        console.log("开始获取IP");
        console.log(evt.candidate);
    }


    myConnect.onaddstream=function (evt) {
        remoteEle.srcObject = evt.stream;
    }


    dataChannel.onmessage=function (msg) {

        console.log("get msg from datachannel")
    }

}


function  handleCandidate(candidate) {


    if(!candidate){
        return;
    }


    if(candidate["sdpMid"]||candidate["sdpMLineIndex"]){
        myConnect.addIceCandidate(new RTCIceCandidate(candidate));
    }


}


