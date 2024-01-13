const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const joints = document.getElementById('joints');
 
let score = 0;

async function setupCamera() {
    video.width = 640;
    video.height = 480;
    const stream = await navigator.mediaDevices.getUserMedia({ 'video': true });
    video.srcObject = stream;

    return new Promise((resolve) => {
        video.onloadedmetadata = () => {
            resolve(video);
        };
    });
}

function setupCanvas() {
    canvas.width = video.width;
    canvas.height = video.height;
}

async function loadModel() {
    return await posenet.load();
}

async function detectPose(net) {
    const pose = await net.estimateSinglePose(video, {
        flipHorizontal: true
    });
    drawPose(pose);
    listJoints(pose);
    requestAnimationFrame(() => detectPose(net));
    checkForHandsInTheAirMove(pose);
    //checkForProperSquat(pose);
}
function drawPose(pose) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
     // Set the background color to black
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.scale(-1, 1); // Flip the canvas context horizontally
    ctx.translate(-canvas.width, 0); // Move the canvas context back into frame

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

 

    // Draw keypoints
    pose.keypoints.forEach(point => {
        if (point.score > 0.8) {
            let mirroredX = canvas.width - point.position.x;
            ctx.beginPath();
            ctx.arc(mirroredX, point.position.y, 5, 0, 2 * Math.PI);
            ctx.fillStyle = 'aqua';
            ctx.fill();
        }
    });

    ctx.restore();
}

function connectJoints(keypoints, pairs) {
    const points = keypoints.reduce((acc, point) => {
        if (point.score > 0.8) {
            acc[point.part] = point;
        }
        return acc;
    }, {});

    pairs.forEach(pair => {
        if (points[pair[0]] && points[pair[1]]) {
            ctx.beginPath();
            ctx.moveTo(canvas.width - points[pair[0]].position.x, points[pair[0]].position.y);
            ctx.lineTo(canvas.width - points[pair[1]].position.x, points[pair[1]].position.y);
            ctx.strokeStyle = 'aqua';
            ctx.lineWidth = 2;
            ctx.stroke();
        }
    });
}




let handsInTheAirMoveDetected = false;

 
 

// let ProperSquat = false;
// function checkForProperSquat(pose) {
//     const leftAnkle = pose.keypoints.find(point => point.part === 'leftAnkle');
//     const rightAnkle = pose.keypoints.find(point => point.part === 'rightAnkle');

//     if (leftAnkle && rightAnkle) {
//         // Check shoulder-width distance between ankles
//         const ankleDistance = Math.abs(leftAnkle.position.x - rightAnkle.position.x);
//         const shoulderWidthThreshold = 0.3; // Adjust this threshold as needed

//         if (ankleDistance >= shoulderWidthThreshold && !ProperSquat) {
//             incrementScore();
//             ProperSquat = true;
//         } else {
//             ProperSquat = false;
//         }
//     }
// }
handsInTheAirMoveDetected = false;
function checkForHandsInTheAirMove(pose) {
    const rightWrist = pose.keypoints.find(point => point.part === 'rightWrist');
    const rightEye = pose.keypoints.find(point => point.part === 'rightEye');
    const leftWrist = pose.keypoints.find(point => point.part === 'leftWrist');
    const leftEye = pose.keypoints.find(point => point.part === 'leftEye');

    const leftAnkle = pose.keypoints.find(point => point.part === 'leftAnkle');
    const rightAnkle = pose.keypoints.find(point => point.part === 'rightAnkle');
    const nose = pose.keypoints.find(point => point.part === 'nose');
    const rightKnee = pose.keypoints.find(p => p.part === 'rightKnee');
    const leftKnee = pose.keypoints.find(p => p.part === 'leftKnee');

    if (rightWrist && rightEye && leftWrist && leftEye && leftAnkle && rightAnkle && rightKnee && leftKnee ) {
        // Check if both wrists are above their respective eyes
        const isRightHandUp = rightWrist.position.y < rightEye.position.y;
        const isLeftHandUp = leftWrist.position.y < leftEye.position.y;
        const rightAnkleMore = rightAnkle.position.x > rightKnee.position.x
        const leftAnkleMore = leftAnkle.position.x < leftKnee.position.x


        if (isRightHandUp && isLeftHandUp && rightAnkleMore && leftAnkleMore && !handsInTheAirMoveDetected) {
            incrementScore();
            handsInTheAirMoveDetected = true;
        } else if (!isRightHandUp && !isLeftHandUp && !rightAnkleMore && !leftAnkleMore) {
            handsInTheAirMoveDetected = false;
        }
    }
}

function incrementScore() {
    const scoreElement = document.getElementById('scoreDisplay');
    const currentScore = parseInt(scoreElement.textContent.split(':')[1]);
    scoreElement.textContent = 'Score: ' + (currentScore + 1);
}


function listJoints(pose) {
    joints.innerHTML = pose.keypoints
        .filter(point => point.score > 0.8)
        .map(point => `${point.part}: (${point.position.x.toFixed(2)}, ${point.position.y.toFixed(2)})`)
        .join('<br>');
}

async function main() {
    await setupCamera();
    video.play();
    setupCanvas();

    const net = await loadModel();

    // Run detectPose once per second (1000 milliseconds)
 
        detectPose(net);

}

main();
