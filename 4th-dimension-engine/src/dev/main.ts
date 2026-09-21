import { SceneApiClient, SceneApiError } from '../api/sceneApi';
import { createDemoScene } from './demoScene';
import { Engine4D } from '../engine/Engine4D';

const canvas = document.getElementById('canvas') as HTMLCanvasElement | null;
const status = document.getElementById('status');
const apiUrlInput = document.getElementById('api-url') as HTMLInputElement | null;
const emailInput = document.getElementById('email') as HTMLInputElement | null;
const passwordInput = document.getElementById('password') as HTMLInputElement | null;
const sceneSelect = document.getElementById('scene-select') as HTMLSelectElement | null;
const authCredentials = document.getElementById('auth-credentials') as HTMLDivElement | null;
const authUser = document.getElementById('auth-user') as HTMLParagraphElement | null;
const btnLogin = document.getElementById('btn-login') as HTMLButtonElement | null;
const btnLoad = document.getElementById('btn-load') as HTMLButtonElement | null;
const btnDemo = document.getElementById('btn-demo') as HTMLButtonElement | null;
const btnPlay = document.getElementById('btn-play') as HTMLButtonElement | null;
const timeSlider = document.getElementById('time-slider') as HTMLInputElement | null;
const timeLabel = document.getElementById('time-label') as HTMLSpanElement | null;
const hyperXw = document.getElementById('hyper-xw') as HTMLInputElement | null;
const hyperYw = document.getElementById('hyper-yw') as HTMLInputElement | null;
const hyperZw = document.getElementById('hyper-zw') as HTMLInputElement | null;
const chkPhysics = document.getElementById('chk-physics') as HTMLInputElement | null;
const chkPinTop = document.getElementById('chk-pin-top') as HTMLInputElement | null;
const chkGroundPlane = document.getElementById('chk-ground-plane') as HTMLInputElement | null;
const btnSnapshot = document.getElementById('btn-snapshot') as HTMLButtonElement | null;

if (
  !canvas ||
  !status ||
  !apiUrlInput ||
  !emailInput ||
  !passwordInput ||
  !sceneSelect ||
  !authCredentials ||
  !authUser ||
  !btnLogin ||
  !btnLoad ||
  !btnDemo ||
  !btnPlay ||
  !timeSlider ||
  !timeLabel ||
  !hyperXw ||
  !hyperYw ||
  !hyperZw ||
  !chkPhysics ||
  !chkPinTop ||
  !chkGroundPlane ||
  !btnSnapshot
) {
  throw new Error('Dev canvas elements not found');
}

const DEFAULT_API_URL = 'http://localhost:4000';
const TOKEN_KEY = '4d-engine-dev-token';
const EMAIL_KEY = '4d-engine-dev-email';

let accessToken = sessionStorage.getItem(TOKEN_KEY) ?? '';
let loggedInEmail = sessionStorage.getItem(EMAIL_KEY) ?? '';
let apiClient: SceneApiClient | null = null;
const engine = new Engine4D({
  canvas,
  apiBaseUrl: apiUrlInput.value || DEFAULT_API_URL,
  accessToken: accessToken || undefined,
});

function setStatus(message: string): void {
  status.textContent = message;
}

function updateTimeUi(time: number, duration: number): void {
  const max = Math.max(duration, 0.01);
  timeSlider.max = String(max);
  timeSlider.value = String(time);
  timeLabel.textContent = `${time.toFixed(2)}s / ${duration.toFixed(2)}s`;
  btnPlay.textContent = engine.isPlaying() ? 'Pause' : 'Play';
}

engine.setOnTimeChange(updateTimeUi);

function getApiBaseUrl(): string {
  return apiUrlInput.value.trim() || DEFAULT_API_URL;
}

function getApiClient(): SceneApiClient {
  if (!apiClient) {
    apiClient = new SceneApiClient({
      baseUrl: getApiBaseUrl(),
      accessToken: accessToken || undefined,
    });
  } else if (accessToken) {
    apiClient.setAccessToken(accessToken);
  }
  return apiClient;
}

function updateAuthUi(): void {
  const isLoggedIn = Boolean(accessToken);

  authCredentials.hidden = isLoggedIn;
  authUser.hidden = !isLoggedIn;
  authUser.textContent = isLoggedIn ? `Signed in as ${loggedInEmail}` : '';

  btnLogin.textContent = isLoggedIn ? 'Logout' : 'Login';
  btnLoad.disabled = !isLoggedIn;

  if (!isLoggedIn) {
    sceneSelect.innerHTML =
      '<option value="">— log in to list scenes —</option>';
  }
}

function logout(): void {
  accessToken = '';
  loggedInEmail = '';
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(EMAIL_KEY);
  apiClient = null;
  passwordInput.value = '';
  updateAuthUi();
  setStatus('Logged out.');
}

function updateHyperplane(): void {
  engine.setHyperplaneRotation({
    xw: parseFloat(hyperXw.value),
    yw: parseFloat(hyperYw.value),
    zw: parseFloat(hyperZw.value),
  });
}

async function populateSceneList(): Promise<void> {
  if (!accessToken) return;

  try {
    const client = getApiClient();
    const { items: scenes } = await client.listScenes({ limit: 100 });

    sceneSelect.innerHTML = '';
    if (scenes.length === 0) {
      sceneSelect.innerHTML =
        '<option value="">— no scenes yet (create one via API) —</option>';
      return;
    }

    for (const scene of scenes) {
      const option = document.createElement('option');
      option.value = scene.id;
      option.textContent = `${scene.title} (${scene.primitiveCount} primitives, ${scene.storageType})`;
      sceneSelect.appendChild(option);
    }
  } catch (error) {
    setStatus(
      error instanceof SceneApiError
        ? `Scene list failed: ${error.message}`
        : 'Scene list failed',
    );
  }
}

async function login(): Promise<void> {
  const email = emailInput.value.trim();
  const password = passwordInput.value;

  if (!email || !password) {
    setStatus('Enter email and password to log in.');
    return;
  }

  try {
    const client = getApiClient();
    accessToken = await client.login(email, password);
    loggedInEmail = email;
    sessionStorage.setItem(TOKEN_KEY, accessToken);
    sessionStorage.setItem(EMAIL_KEY, email);
    passwordInput.value = '';
    updateAuthUi();
    setStatus(`Logged in as ${email}`);
    await populateSceneList();
  } catch (error) {
    setStatus(
      error instanceof SceneApiError
        ? `Login failed: ${error.message}`
        : 'Login failed',
    );
  }
}

async function loadFromApi(): Promise<void> {
  const sceneId = sceneSelect.value;

  if (!sceneId) {
    setStatus('Select a scene or log in first.');
    return;
  }

  if (!accessToken) {
    setStatus('Log in to load scenes from the platform API.');
    return;
  }

  try {
    setStatus('Loading 4D primitives from backend…');

    const scene = await engine.loadSceneFromApi(sceneId, {
      apiBaseUrl: getApiBaseUrl(),
      accessToken,
    });

    updateTimeUi(0, scene.duration);
    setStatus(
      `Rendering "${scene.title}" — drag canvas to orbit · scrub time · rotate hyperplane`,
    );
  } catch (error) {
    setStatus(
      error instanceof SceneApiError
        ? `Load failed: ${error.message}`
        : error instanceof Error
          ? error.message
          : 'Load failed',
    );
  }
}

function loadDemo(): void {
  const demo = createDemoScene();
  engine.loadScene(demo);
  updateTimeUi(0, demo.duration);
  setStatus(
    'Local demo — drag to orbit · play/pause · hyperplane sliders explore 4D',
  );
}

btnLogin.addEventListener('click', () => {
  if (accessToken) {
    logout();
    return;
  }
  void login();
});
btnLoad.addEventListener('click', () => void loadFromApi());
btnDemo.addEventListener('click', loadDemo);

btnPlay.addEventListener('click', () => {
  engine.togglePlay();
  btnPlay.textContent = engine.isPlaying() ? 'Pause' : 'Play';
});

timeSlider.addEventListener('pointerdown', () => {
  engine.pause();
});

timeSlider.addEventListener('input', () => {
  engine.setTime(parseFloat(timeSlider.value));
});

hyperXw.addEventListener('input', updateHyperplane);
hyperYw.addEventListener('input', updateHyperplane);
hyperZw.addEventListener('input', updateHyperplane);

chkPhysics.addEventListener('change', () => {
  engine.physics.setEnabled(chkPhysics.checked);
  setStatus(chkPhysics.checked ? 'XPBD Physics active' : 'Physics disabled');
});

chkPinTop.addEventListener('change', () => {
  engine.physics.setPinTopParticles(chkPinTop.checked);
  const stats = engine.physics.getStats();
  setStatus(`Pinning top particles: ${chkPinTop.checked ? `${stats.pinnedCount} pinned` : 'Disabled'}`);
});

chkGroundPlane.addEventListener('change', () => {
  engine.physics.configure({
    groundPlane: {
      ...engine.physics.getConfig().groundPlane,
      enabled: chkGroundPlane.checked,
    },
  });
  setStatus(`Ground plane collision: ${chkGroundPlane.checked ? 'ON (-2.0)' : 'OFF'}`);
});

btnSnapshot.addEventListener('click', async () => {
  const sceneId = sceneSelect.value;
  if (!sceneId || !accessToken) {
    setStatus('Select a scene and log in to save snapshots.');
    return;
  }

  try {
    const client = getApiClient();
    const snapshot = engine.physics.getSnapshot(engine.getTime(), {
      xw: parseFloat(hyperXw.value),
      yw: parseFloat(hyperYw.value),
      zw: parseFloat(hyperZw.value),
    });

    await client.saveSnapshot(sceneId, snapshot);
    setStatus('Physics & simulation snapshot saved to backend API!');
  } catch (error) {
    setStatus(error instanceof Error ? `Snapshot error: ${error.message}` : 'Save snapshot failed');
  }
});

apiUrlInput.addEventListener('change', () => {
  apiClient = null;
});

window.addEventListener('resize', () => {
  const rect = canvas.getBoundingClientRect();
  engine.context.resize(rect.width, rect.height);
  engine.renderer.render();
});

try {
  loadDemo();
  engine.play();
  updateAuthUi();

  if (accessToken) {
    void populateSceneList();
  }
} catch (error) {
  setStatus(
    error instanceof Error ? error.message : 'Failed to initialize engine',
  );
  console.error(error);
}

