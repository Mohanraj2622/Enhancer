let fileInput = document.getElementById('fileInput');
let enhanceBtn = document.getElementById('enhanceBtn');
let exportBtn = document.getElementById('exportBtn');
let canvas = document.getElementById('canvas');

let originalPreview = document.getElementById('originalPreview');
let enhancedPreview = document.getElementById('enhancedPreview');

let originalImage = document.getElementById('originalImage');
let enhancedImage = document.getElementById('enhancedImage');

let imageSliderWrapper = document.getElementById('imageSliderWrapper');
let progressBar = document.getElementById('progressBar');
let warning = document.getElementById('warning');
let sliderHandle = document.getElementById('sliderHandle');

let model;
let enhancedBlob;

// Load TF model
async function loadModel() {
  model = await tf.loadGraphModel(
    'https://tfhub.dev/captain-pool/esrgan-tfjs/1/default/1',
    { fromTFHub: true }
  );
  console.log("Model loaded");
}
loadModel();

// File input handler
fileInput.addEventListener('change', handleFile);

async function handleFile(e) {
  resetUI();
  const file = e.target.files[0];
  if (!file) return;

  const url = URL.createObjectURL(file);

  // Show warning if file size is too big (>6MB)
  if (file.size > 6 * 1024 * 1024) {
    warning.style.display = 'block';
  }

  if (file.type.startsWith('image/')) {
    originalImage.src = url;
    enhancedImage.src = '';
    imageSliderWrapper.style.display = 'block';
    enhanceBtn.style.display = 'inline-block';
  } else if (file.type.startsWith('video/')) {
    const video = document.createElement('video');
    video.src = url;
    video.controls = true;

    const enhancedVideo = document.createElement('video');
    enhancedVideo.src = url;
    enhancedVideo.controls = true;
    enhancedVideo.style.filter = "contrast(1.2) saturate(1.5) brightness(1.1)";

    originalPreview.appendChild(video);
    enhancedPreview.appendChild(enhancedVideo);
  }
}

enhanceBtn.addEventListener('click', async () => {
  if (!model || !originalImage.src) return;

  showProgress(10);

  const imgElement = new Image();
  imgElement.crossOrigin = "anonymous";
  imgElement.src = originalImage.src;

  imgElement.onload = async () => {
    canvas.width = imgElement.width;
    canvas.height = imgElement.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(imgElement, 0, 0);

    showProgress(30);

    const tensor = tf.browser.fromPixels(canvas).toFloat().div(255).expandDims();
    const enhanced = model.execute(tensor);

    showProgress(60);

    const squeezed = tf.squeeze(enhanced);
    await tf.browser.toPixels(squeezed, canvas);

    enhancedImage.src = canvas.toDataURL();
    enhancedImage.style.display = 'block';
    exportBtn.style.display = 'inline-block';

    canvas.toBlob((blob) => {
      enhancedBlob = blob;
    }, 'image/png');

    showProgress(100);
  };
});

exportBtn.addEventListener('click', () => {
  if (!enhancedBlob) return;
  const a = document.createElement('a');
  a.href = URL.createObjectURL(enhancedBlob);
  a.download = 'enhanced.png';
  a.click();
});

// Progress bar function
function showProgress(percent) {
  progressBar.style.width = percent + '%';
}

// Reset UI
function resetUI() {
  enhancedImage.src = '';
  originalImage.src = '';
  imageSliderWrapper.style.display = 'none';
  enhancedPreview.innerHTML = '';
  originalPreview.innerHTML = '';
  enhanceBtn.style.display = 'none';
  exportBtn.style.display = 'none';
  progressBar.style.width = '0%';
  warning.style.display = 'none';
}

// Slider dragging
let dragging = false;

sliderHandle.addEventListener('mousedown', () => dragging = true);
document.addEventListener('mouseup', () => dragging = false);
document.addEventListener('mousemove', (e) => {
  if (!dragging) return;
  const slider = document.querySelector('.slider');
  const rect = slider.getBoundingClientRect();
  let percent = ((e.clientX - rect.left) / rect.width) * 100;
  percent = Math.max(0, Math.min(100, percent));
  sliderHandle.style.left = percent + '%';
  enhancedImage.style.clipPath = `inset(0 ${100 - percent}% 0 0)`;
});
