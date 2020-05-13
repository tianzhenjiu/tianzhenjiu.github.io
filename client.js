+ function () {
   //our username 
   var name;
   var connectedUser;

   let query = location.search.replace(/^\?/g, '').split('&')
   let queryobj = {};
   let room = '';


   if (query) {
      query.forEach(x => {
         let arr = x.split('=');
         queryobj[arr[0]] = arr[1]
      })

   }
   console.log('queryobj', queryobj);
   if (!queryobj.u) {
      return
   }


   //connecting to our signaling server
   // var conn = new WebSocket('wss://redtb-test.sixeco.com/api/v1.0/redt_b_ws/customerService');
   // var conn = new WebSocket('wss://neco.baojunev.com:8343');
   var conn=new WebSocket("wss://redtb-test.sixeco.com/api/v1.0/redt_b_ws/customerService/"+queryobj.u); //这是新的



   // telnet redtb-test.sixeco.com  8444
   conn.onopen = function () {
      console.log("Connected to the signaling server");
   };

   //when we got a message from a signaling server 
   conn.onmessage = function (msg) {
      console.log("Got message", msg.data);
      if (msg.data === "Hello world") {
         console.log(' msg.data === "string"');
         return
      }
      var data = JSON.parse(msg.data);

      switch (data.type) {
         case "login":
            handleLogin(data.success);
            break;
            //when somebody wants to call us 
         case "offer":
            handleOffer(data.offer, data.name);
            break;
         case "answer":
            handleAnswer(data.answer);
            break;
            //when a remote peer sends an ice candidate to us 
         case "candidate":
            handleCandidate(data.candidate);
            break;
         case "leave":
            console.log('通话挂断了');
            handleLeave();
            break;
         default:
            break;
      }
   };

   conn.onerror = function (err) {
      console.log("Got error", err);
   };

   //alias for sending JSON encoded messages 
   function send(message) {
      //attach the other peer username to our messages 
      if (connectedUser) {
         message.name = connectedUser;
      }

      conn.send(JSON.stringify(message));
   };

   //****** 
   //UI selectors block 
   //******


   var rightTips = document.querySelector('#rightTips')



   var loginPage = document.querySelector('#loginPage');
   var usernameInput = document.querySelector('#usernameInput');
   var loginBtn = document.querySelector('#loginBtn');

   var callPage = document.querySelector('#callPage');
   var callToUsernameInput = document.querySelector('#callToUsernameInput');
   var callBtn = document.querySelector('#callBtn');

   var hangUpBtn = document.querySelector('#hangUpBtn');

   var localVideo = document.querySelector('#localVideo');
   var remoteVideo = document.querySelector('#remoteVideo');

   var yourConn;
   var stream;

   callPage.style.display = "none";



   name = queryobj.u;
   console.log('queryobj.u ', queryobj.u);

   setTimeout(() => {

      if (name.length > 0) {
         send({
            type: "login",
            name: name
         });
      }
   }, 2500);

   // Login when the user clicks the button 
   loginBtn.addEventListener("click", function (event) {
      name = usernameInput.value;

      if (name.length > 0) {
         send({
            type: "login",
            name: name
         });
      }

   });



    callPage.addEventListener("click",function (event) {



       var oldSrc=localVideo.srcObject;


       localVideo.srcObject=remoteVideo.srcObject;

       localVideo.load();

        remoteVideo.srcObject=oldSrc;

        remoteVideo.load();

    });

   function handleLogin(success) {
      if (success === false) {
         alert("Ooops...try a different username");
      } else {
         loginPage.style.display = "none";
         callPage.style.display = "block";

         rightTips.innerText = '连接中…'

         //********************** 
         //Starting a peer connection 
         //********************** 

         //getting local video stream 


         var constraints = {
            video: true,
            audio: true,
            // video: {
            //     width: { min:640, ideal: 1280, max: 1920 },
            //     height: { min: 480, ideal: 720, max: 1080 },
            //     facingMode: 'user'     // 前置摄像头
            // }
         };
         navigator.mediaDevices.getUserMedia(constraints).then(s => {
               stream = s;
               //  localVideo.src = window.URL.createObjectURL(stream); 
               rightTips.innerText = '在线'
               localVideo.srcObject = stream;
               //using Google public stun server 
               var configuration = {
                  "iceServers": [
                     {

                        //			"urls": ["stun:106.14.191.21:3478"],
                        //			"username":"Sixeco",
                        //			"password":"Sixeco@123"
                        //			"url":"stun:stun.l.google.com:19302"
                        "urls": ["turn:106.14.191.21:3478"],
                        "username": "Sixeco",
                        "credential": "Sixeco@123"

                     },
                     {
                        urls: [
                          "stun:106.14.191.21:3478"
                        ]
                     },
                  ]
               };
               //yourConn = new webkitRTCPeerConnection(configuration);
               //
               //var PeerConnection = window.RTCPeerConnection || window.mozRTCPeerConnection || window.webkitRTCPeerConnection;
               yourConn = new RTCPeerConnection(configuration, {
                  optional: [{
                     RtpDataChannels: true
                  }]
               });
               //dataChannel = yourConn.createDataChannel("channel1", {reliable:true});
               // setup stream listening 
               yourConn.addStream(stream);

               stream.onaddtrack = function (e) {
                  alert(e);
               }


               //when a remote user adds stream to the peer connection, we display it 
               yourConn.onaddstream = function (e) {
                  //remoteVideo.srcObject = window.URL.createObjectURL(e.stream); 
                  remoteVideo.srcObject = e.stream
                  callPage.style.display = "block";
               };

               // Setup ice handling 
               yourConn.onicecandidate = function (event) {
                  if (event.candidate) {
                     console.log(event.candidate);
                     send({
                        type: "candidate",
                        candidate: event.candidate
                     });
                  }
               };


               if(queryobj.r){
                  connectedUser = queryobj.r;
                  console.log('开始默认连接');
                  
                  // create an offer 
                  yourConn.createOffer(function (offer) {
                     send({
                        type: "offer",
                        offer: offer
                     });

                     yourConn.setLocalDescription(offer, function (suc) {
                        console.log(suc);
                     }, function (error) {
                        console.log(error);
                     });
                  }, function (error) {
                     alert("Error when creating an offer");
                  });
               }




            })
            .catch(function (e) {
               alert("Error. WebRTC is not supported!");
               alert(e);
            });


      }
   };

   //initiating a call 
   callBtn.addEventListener("click", function () {
      var callToUsername = callToUsernameInput.value;

      if (callToUsername.length > 0) {

         connectedUser = callToUsername;

         // create an offer 
         yourConn.createOffer(function (offer) {
            send({
               type: "offer",
               offer: offer
            });

            yourConn.setLocalDescription(offer, function (suc) {
               console.log(suc);
            }, function (error) {
               console.log(error);
            });
         }, function (error) {
            alert("Error when creating an offer");
         });

      }
   });

   //when somebody sends us an offer 
   function handleOffer(offer, name) {
      connectedUser = name;
      yourConn.setRemoteDescription(new RTCSessionDescription(offer));

      //create an answer to an offer 
      yourConn.createAnswer(function (answer) {
         yourConn.setLocalDescription(answer);

         send({
            type: "answer",
            answer: answer
         });

      }, function (error) {
         alert("Error when creating an answer");
      });
   };

   //when we got an answer from a remote user
   function handleAnswer(answer) {
      yourConn.setRemoteDescription(new RTCSessionDescription(answer));
   };

   //when we got an ice candidate from a remote user 
   function handleCandidate(candidate) {
      yourConn.addIceCandidate(new RTCIceCandidate(candidate));
   };

   //hang up 
   hangUpBtn.addEventListener("click", function () {

      send({
         type: "leave"
      });

      handleLeave();
      callPage.style.display = "none";
   });
   
   
   

   function handleLeave() {
      connectedUser = null;
      remoteVideo.src = null;

      yourConn.close();
      yourConn.onicecandidate = null;
      yourConn.onaddstream = null; 
      parent.window.closeCallIframe(); 
   };

}()