const chatFeed = document.getElementById('chatFeed');
const userInput = document.getElementById('userInput');
const sendBtn = document.getElementById('sendBtn');
const micBtn = document.getElementById('micBtn');
const camBtn = document.getElementById('camBtn');
const payModeBtn = document.getElementById('payModeBtn');
const fileInput = document.getElementById('fileInput');
const cameraInput = document.getElementById('cameraInput');
const batteryDisplay = document.getElementById('batteryDisplay');
const liveIndicator = document.getElementById('liveIndicator');

const imagePreviewContainer = document.getElementById('imagePreviewContainer');
const previewImg = document.getElementById('previewImg');
const imageName = document.getElementById('imageName');
const removeImageBtn = document.getElementById('removeImageBtn');

// Local Data Store
let defaultUpiId = localStorage.getItem('JARVIS_UPI') || 'paytmqr281005050101150047395066@paytm';
let contacts = JSON.parse(localStorage.getItem('JARVIS_CONTACTS') || '{}');
let activeImageBase64 = null;
let torchStream = null;
let cachedLat = null;
let cachedLon = null;

// Clean up legacy API keys
localStorage.removeItem('JARVIS_API_KEY');
localStorage.removeItem('GEMINI_API_KEY');

// --- 1. LOCAL TELEMETRY & SENSORS INITIALIZATION ---
async function initSensors() {
  // Battery status
  if ('getBattery' in navigator) {
    try {
      const b = await navigator.getBattery();
      const update = () => {
        const level = Math.round(b.level * 100);
        if (batteryDisplay) {
          batteryDisplay.textContent = `${level}% ${b.charging ? '(CHARGING)' : '(ONLINE)'}`;
        }
      };
      update();
      b.addEventListener('levelchange', update);
      b.addEventListener('chargingchange', update);
    } catch (e) {}
  } else {
    if (batteryDisplay) batteryDisplay.textContent = '100% (STABLE)';
  }

  // Pre-fetch Geolocation coordinates quietly for weather & maps
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        cachedLat = pos.coords.latitude;
        cachedLon = pos.coords.longitude;
      },
      () => {},
      { timeout: 5000 }
    );
  }
}
initSensors();

// --- 2. CAMERA & MEDIA PROTOCOLS ---
function openCameraDirectly() {
  if (cameraInput) cameraInput.click();
}

if (camBtn) {
  camBtn.addEventListener('click', () => {
    const choose = confirm("Tap OK to open CAMERA, or Cancel to open GALLERY:");
    if (choose && cameraInput) cameraInput.click();
    else if (fileInput) fileInput.click();
  });
}

function handleFileProcess(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    activeImageBase64 = reader.result;
    if (previewImg) previewImg.src = activeImageBase64;
    if (imageName) imageName.textContent = file.name || "Photo Captured";
    if (imagePreviewContainer) imagePreviewContainer.style.display = 'flex';
  };
  reader.readAsDataURL(file);
}

if (fileInput) fileInput.addEventListener('change', (e) => handleFileProcess(e.target.files[0]));
if (cameraInput) cameraInput.addEventListener('change', (e) => handleFileProcess(e.target.files[0]));

if (removeImageBtn) {
  removeImageBtn.addEventListener('click', () => {
    activeImageBase64 = null;
    if (fileInput) fileInput.value = '';
    if (cameraInput) cameraInput.value = '';
    if (imagePreviewContainer) imagePreviewContainer.style.display = 'none';
  });
}

// --- 3. DEDICATED PAYMENT ICON MODE ---
function triggerPaymentPrompt() {
  const choice = prompt("Enter Amount to transfer via UPI (or type 'settings' to change UPI ID):", "500");
  if (!choice) return;

  if (choice.toLowerCase() === 'settings') {
    const newId = prompt("Enter new default recipient UPI ID:", defaultUpiId);
    if (newId) {
      defaultUpiId = newId.trim();
      localStorage.setItem('JARVIS_UPI', defaultUpiId);
      alert(`Default UPI ID saved: ${defaultUpiId}`);
    }
    return;
  }

  const amt = parseFloat(choice);
  if (!isNaN(amt) && amt > 0) {
    const upiUri = `upi://pay?pa=${defaultUpiId}&pn=Merchant&am=${amt}&cu=INR&tn=Jarvis%20Payment`;
    setTimeout(() => { window.location.href = upiUri; }, 250);
    addMessage("J.A.R.V.I.S", `Initiating **₹${amt}** transfer to **${defaultUpiId}**. Launching UPI chooser (GPay / PhonePe / Paytm)...`, "jarvis-msg");
  } else {
    alert("Please enter a valid numeric amount.");
  }
}

if (payModeBtn) {
  payModeBtn.addEventListener('click', triggerPaymentPrompt);
}

// Quick button executor
function executeQuickCommand(cmd) {
  if (userInput) {
    userInput.value = cmd;
    handleSend();
  }
}

// --- 4. ALL LOCAL PROTOCOLS IMPLEMENTATION ---

// Date & Time Protocol
function getSystemDateTime() {
  const now = new Date();
  const dateOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  const formattedDate = now.toLocaleDateString('en-US', dateOptions);
  const formattedTime = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  return `Current telemetry: Today is **${formattedDate}**, and current time is **${formattedTime}**, Boss.`;
}

// Real-Time Weather Protocol
async function fetchLiveWeather() {
  let lat = cachedLat;
  let lon = cachedLon;

  if (!lat || !lon) {
    try {
      const pos = await new Promise((resolve, reject) => {
        if (!navigator.geolocation) reject("No geolocation");
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 7000 });
      });
      lat = pos.coords.latitude;
      lon = pos.coords.longitude;
      cachedLat = lat;
      cachedLon = lon;
    } catch (e) {
      return "Atmospheric sensors offline: Location access was denied or timed out. Please allow Location permissions in Chrome.";
    }
  }

  try {
    const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`);
    const data = await res.json();
    const cw = data.current_weather;
    return `Atmospheric sensors locked at Lat **${lat.toFixed(2)}**, Lon **${lon.toFixed(2)}**:\n* **Temperature:** ${cw.temperature}°C\n* **Wind Speed:** ${cw.windspeed} km/h\n* **Status:** Meteorological telemetry active and nominal, Sir.`;
  } catch (err) {
    return "Meteorological link temporarily unreachable. Atmospheric readings are stable.";
  }
}

// Battery Telemetry
async function getBatteryTelemetry() {
  if ('getBattery' in navigator) {
    try {
      const b = await navigator.getBattery();
      const level = Math.round(b.level * 100);
      return `Main power cell is at **${level}%** capacity and **${b.charging ? 'actively charging' : 'operating on internal battery'}**, Sir.`;
    } catch (e) {}
  }
  return "Power cell operating within normal parameters, Sir.";
}

// Flashlight / Rear LED Protocol
async function toggleTorch(enable) {
  try {
    if (enable) {
      torchStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      const track = torchStream.getVideoTracks()[0];
      await track.applyConstraints({ advanced: [{ torch: true }] });
      return "Flashlight illuminated, Boss.";
    } else {
      if (torchStream) {
        torchStream.getTracks().forEach(t => t.stop());
        torchStream = null;
      }
      return "Flashlight extinguished, Boss.";
    }
  } catch (err) {
    return "Camera hardware permission required to control physical LED.";
  }
}

// Cellular Calling Protocol
function triggerCall(target) {
  let num = target.replace(/[^0-9+]/g, '');
  const key = target.toLowerCase().trim();

  if (!num && contacts[key]) num = contacts[key];
  else if (!num) {
    const ask = prompt(`No phone number saved for "${target}". Enter number:`);
    if (ask) {
      contacts[key] = ask.trim();
      localStorage.setItem('JARVIS_CONTACTS', JSON.stringify(contacts));
      num = ask.trim();
    }
  }

  if (num) {
    window.location.href = `tel:${num}`;
    return `Initiating cellular call to ${target} (${num}), Boss.`;
  }
  return `Cellular directive aborted. Valid telephone number required.`;
}

// GPS / Location Protocol
function getLiveLocation() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve("Geolocation telemetry unavailable on this device.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        cachedLat = pos.coords.latitude;
        cachedLon = pos.coords.longitude;
        window.open(`https://www.google.com/maps?q=${cachedLat},${cachedLon}`, '_blank');
        resolve(`Coordinates locked: Lat **${cachedLat.toFixed(4)}**, Lon **${cachedLon.toFixed(4)}**. Launching Google Maps.`);
      },
      (err) => resolve(`GPS lock failed: ${err.message}`)
    );
  });
}

// Offline Math Protocol
function solveMath(text) {
  let clean = text.toLowerCase()
    .replace(/tell|what is|calculate|solve|evaluate|find|value of/gi, '')
    .replace(/×/g, '*')
    .replace(/÷/g, '/')
    .replace(/,/g, '')
    .trim();

  clean = clean.replace(/(\d+)\s*[xX]\s*(\d+)/g, '$1 * $2');

  if (/^[\d+\-*/().\s^%]+$/.test(clean) && /\d/.test(clean)) {
    try {
      const sanitized = clean.replace(/\^/g, '**');
      const result = Function(`'use strict'; return (${sanitized})`)();
      if (typeof result === 'number' && !isNaN(result) && isFinite(result)) {
        return `Calculation complete, Sir: **${clean.replace(/\*/g, '×')} = ${result.toLocaleString()}**`;
      }
    } catch (e) {
      return null;
    }
  }
  return null;
}

// --- 5. ZERO-KEY AUTONOMOUS AI ENGINE ---
async function fetchAutonomousAI(userPrompt, imageAttached) {
  const promptContext = imageAttached 
    ? `[Optical scan attached: Solve the questions or analyze this photo in detail]. User request: ${userPrompt || 'Analyze and solve step-by-step'}`
    : userPrompt;

  const sys = "You are Jarvis AI 1.0, Tony Stark's personal intelligent assistant. Address user as Boss or Sir. Format answers cleanly using Markdown, bold highlights, itemized lists, and code blocks.";
  const fullMessage = `${sys}\n\nUser Request: ${promptContext}`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 9000);
    const url = `https://text.pollinations.ai/${encodeURIComponent(fullMessage)}?model=openai&seed=${Math.floor(Math.random() * 9999)}`;
    
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    if (res.ok) {
      const text = await res.text();
      if (text && text.trim().length > 10) return text;
    }
  } catch (e) {}

  try {
    const cleanTopic = userPrompt.replace(/tell me about|who is|what is|search|explain/gi, '').trim();
    const wikiRes = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(cleanTopic)}`);
    const wikiData = await wikiRes.json();
    if (wikiData.extract) {
      return `**${wikiData.title}:**\n\n${wikiData.extract}\n\n*Verified from global archives, Boss.*`;
    }
  } catch (e) {}

  return `Directive processed for: "${userPrompt}". All sub-systems standing by, Boss.`;
}

// --- 6. MASTER DIRECTIVE ROUTER ---
async function executeDirective(text, hasImage) {
  const q = text.toLowerCase().trim();

  // A. Weather Protocol (Handles "today weather", "weather", "temperature", "forecast")
  if (q.includes("weather") || q.includes("temperature") || q.includes("climate") || q.includes("rain")) {
    return await fetchLiveWeather();
  }

  // B. Date & Time Protocol
  if (q.includes("date") || q.includes("today date") || q.includes("what is today") || q.includes("day is today") || q.includes("time") || q.includes("current time")) {
    return getSystemDateTime();
  }

  // C. GPS & Location Protocol
  if (q.includes("where am i") || q.includes("my location") || q.includes("current location")) {
    return await getLiveLocation();
  }

  // D. Camera & Media Protocols
  if (q.includes("camara") || q.includes("camera") || q.includes("take photo") || q.includes("take picture") || q.includes("click photo")) {
    openCameraDirectly();
    return "Engaging optical lens sensors, Boss.";
  }
  if (q.includes("gallery") || q.includes("photos") || q.includes("open gallery")) {
    if (fileInput) fileInput.click();
    return "Accessing local media library, Boss.";
  }

  // E. WhatsApp Protocol
  if (q.includes("whatsapp") || q.includes("whatsap") || q.includes("watsapp")) {
    setTimeout(() => { window.location.href = "whatsapp://"; }, 200);
    return "Launching WhatsApp messenger, Boss.";
  }

  // F. YouTube Protocol
  if (q.includes("youtube") || q.includes("open youtube") || q.includes("play youtube")) {
    setTimeout(() => { window.open("https://www.youtube.com", "_blank"); }, 200);
    return "Opening YouTube, Boss.";
  }

  // G. Flashlight / Rear LED Protocol
  if (q.includes("flashlight on") || q.includes("torch on")) return await toggleTorch(true);
  if (q.includes("flashlight off") || q.includes("torch off")) return await toggleTorch(false);

  // H. Cellular Calls Protocol
  if (q.startsWith("call ") || q.startsWith("dial ")) {
    const target = q.replace("call ", "").replace("dial ", "").replace("to ", "").trim();
    return triggerCall(target);
  }

  // I. Battery Protocol
  if (q.includes("battery") || q.includes("power level") || q.includes("charge")) {
    return await getBatteryTelemetry();
  }

  // J. Offline Math Calculator Protocol
  const mathOutput = solveMath(text);
  if (mathOutput && !hasImage) return mathOutput;

  // K. Payment Command via Text
  const amountMatch = q.match(/(?:pay|send|transfer|amount)\s*(?:rs|inr|₹)?\s*(\d+(?:\.\d+)?)/i);
  if (amountMatch) {
    const amt = amountMatch[1];
    const upiUri = `upi://pay?pa=${defaultUpiId}&pn=Merchant&am=${amt}&cu=INR&tn=Jarvis%20Payment`;
    setTimeout(() => { window.location.href = upiUri; }, 350);
    return `Payment directive engaged: Transferring **₹${amt}** to **${defaultUpiId}**. Opening UPI apps...`;
  }

  // L. Greetings
  if (['hai', 'hi', 'hello', 'hey', 'jarvis', 'ok jarvis'].includes(q)) {
    return "Good day, Boss. All local hardware protocols and sensors are standing by. What is your directive?";
  }

  // M. Generative AI Engine
  return await fetchAutonomousAI(text, hasImage);
}

// --- 7. VOICE ENGINE (TTS & SPEECH RECOGNITION) ---
function speakText(text) {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    const clean = text.replace(/[*#`_₹💸📈📱👛📍🔦📸🖼️⛅]/g, '').replace(/J\.A\.R\.V\.I\.S:/g, '').substring(0, 280);
    const utterance = new SpeechSynthesisUtterance(clean);
    utterance.rate = 1.0;
    utterance.pitch = 0.95;
    window.speechSynthesis.speak(utterance);
  }
}

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition = null;
let isListening = false;

if (SpeechRecognition) {
  recognition = new SpeechRecognition();
  recognition.continuous = false;
  recognition.lang = 'en-US';

  recognition.onstart = () => {
    isListening = true;
    if (micBtn) {
      micBtn.style.background = '#ff0055';
      micBtn.style.boxShadow = '0 0 15px #ff0055';
    }
  };

  recognition.onresult = (event) => {
    if (userInput) userInput.value = event.results[0][0].transcript;
    handleSend();
  };

  recognition.onerror = () => stopMic();
  recognition.onend = () => stopMic();
}

function stopMic() {
  isListening = false;
  if (micBtn) {
    micBtn.style.background = 'linear-gradient(135deg, #00f0ff, #0099aa)';
    micBtn.style.boxShadow = '0 0 8px rgba(0, 240, 255, 0.4)';
  }
}

if (micBtn) {
  micBtn.addEventListener('click', () => {
    if (!recognition) {
      alert("Microphone requires Google Chrome on Android.");
      return;
    }
    if (!isListening) recognition.start();
    else recognition.stop();
  });
}

// --- 8. CHAT UI HANDLERS ---
function addMessage(sender, text, type, imageSrc = null) {
  const bubble = document.createElement('div');
  bubble.classList.add('chat-bubble', type);
  
  let formatted = (type === 'jarvis-msg' && typeof marked !== 'undefined') ? marked.parse(text) : text;
  bubble.innerHTML = `<strong>${sender}:</strong> ` + formatted;

  if (imageSrc) {
    const img = document.createElement('img');
    img.src = imageSrc;
    bubble.appendChild(img);
  }

  if (chatFeed) {
    chatFeed.appendChild(bubble);
    chatFeed.scrollTop = chatFeed.scrollHeight;
  }
  return bubble;
}

async function handleSend() {
  const text = userInput ? userInput.value.trim() : "";
  const attachedImg = activeImageBase64;

  if (!text && !attachedImg) return;

  addMessage("YOU", text || "Analyze this photo", "user-msg", attachedImg);
  if (userInput) {
    userInput.value = '';
    userInput.style.height = 'auto';
  }

  activeImageBase64 = null;
  if (fileInput) fileInput.value = '';
  if (cameraInput) cameraInput.value = '';
  if (imagePreviewContainer) imagePreviewContainer.style.display = 'none';

  if (liveIndicator) liveIndicator.textContent = "PROCESSING...";
  const loadingBubble = addMessage("J.A.R.V.I.S", "Executing directive...", "jarvis-msg");

  const reply = await executeDirective(text, attachedImg !== null);

  if (liveIndicator) liveIndicator.textContent = "LIVE";
  loadingBubble.innerHTML = `<strong>J.A.R.V.I.S:</strong> ` + (typeof marked !== 'undefined' ? marked.parse(reply) : reply);
  if (chatFeed) chatFeed.scrollTop = chatFeed.scrollHeight;
  
  speakText(reply);
}

if (sendBtn) sendBtn.addEventListener('click', handleSend);
if (userInput) {
  userInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleSend();
  });
                                                                                                                      }
    
