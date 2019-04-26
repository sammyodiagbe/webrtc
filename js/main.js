// understanding how webrtc works
document.getElementsByTagName("body")[0].style.background = "blue";
var config = {
  apiKey: "AIzaSyB2m-gFr9ViCLV2d5fUqnnn_hVvmNOyuvI",
  authDomain: "webrtcdemo-5ce87.firebaseapp.com",
  databaseURL: "https://webrtcdemo-5ce87.firebaseio.com",
  projectId: "webrtcdemo-5ce87",
  storageBucket: "webrtcdemo-5ce87.appspot.com",
  messagingSenderId: "39723603284"
};
firebase.initializeApp(config);

let database = firebase.database().ref();

//grabbing the video elements
let localVideo = getVideoElement("localVideo");
let remoteVideo = getVideoElement("remoteVideo");

function getVideoElement(id) {
  return document.querySelector(`video#${id}`);
}

// an id that will be assigned to this user
let id = Math.floor(Math.random() * 100000000000);
const iceServers = {
  iceServers: [{ url: "stun:stun.l.google.com:19302" }]
};

const peerConnection = new RTCPeerConnection(iceServers);
peerConnection.onicecandidate = event =>
  event.candidate
    ? sendMessage(id, JSON.stringify({ ice: event.candidate }))
    : console.log("sent all ice");

// add stream when there is a stream
peerConnection.ontrack = track => (remoteVideo.srcObject = track.streams[0]);

function sendMessage(senderId, data) {
  let msg = database.push({ sender: senderId, message: data });
  msg.remove();
}

// read the message that was pushed to the database
function readMessage(data) {
  console.log("recieved data: ", data.val());
  let msg = JSON.parse(data.val().message);
  var sender = data.val().sender;
  if (sender != id) {
    if (msg.ice != undefined) {
      peerConnection.addIceCandidate(new RTCIceCandidate(msg.ice));
    } else if (msg.sdp.type == "offer") {
      peerConnection
        .setRemoteDescription(new RTCSessionDescription(msg.sdp))
        .then(() => {
          peerConnection
            .createAnswer()
            .then(answer => peerConnection.setLocalDescription(answer))
            .then(() =>
              sendMessage(
                id,
                JSON.stringify({ sdp: peerConnection.localDescription })
              )
            );
        });
    } else if ((msg.sdp.type = "answer")) {
      peerConnection.setRemoteDescription(new RTCSessionDescription(msg.sdp));
    }
  }
}

database.on("child_added", readMessage);

function showMyFace() {
  try {
    navigator.mediaDevices
      .getUserMedia({
        video: {
          mandatory: {},
          optional: [{ minHeight: 200 }, { minWidth: 200 }]
        }
      })
      .then(stream => (localVideo.srcObject = stream))
      .then(stream =>
        stream.getTracks().forEach(track => {
          peerConnection.addTrack(track, stream);
        })
      )
      .catch(err => console.log(err));
  } catch (err) {
    console.log(err.toString());
  }
}

function showFriendFace() {
  try {
    peerConnection
      .createOffer()
      .then(offer => peerConnection.setLocalDescription(offer))
      .then(() =>
        sendMessage(
          id,
          JSON.stringify({ sdp: peerConnection.localDescription })
        )
      );
  } catch (err) {
    console.log(err.toString());
  }
}
