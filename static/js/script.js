const verificationSection = document.getElementById('verification-section');
const codeSection = document.getElementById('code-section');
const totpInput = document.getElementById('totp-input');
const verifyButton = document.getElementById('verify-button');
const verificationMessage = document.getElementById('verification-message');
const progressBar = document.getElementById('progress-bar');
const profileSelect = document.getElementById('profile-select');
const profileInfo = document.getElementById('profile-info-card');
const profileLabel = document.getElementById('profile-label');
const logoutButton = document.getElementById('logout-button');

let profiles = [];
let verified = false;
let verified_profile = '';
let eventSource = null;

// 时间格式化函数
function formatTimestamp(timestamp) {
  const date = new Date(timestamp * 1000);
  return `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')} ` +
    `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:${String(date.getSeconds()).padStart(2, '0')}`;
}

// 获取可用的用户配置
async function fetchProfiles() {
  try {
    const response = await fetch('/api/profiles');
    if (response.ok) {
      profiles = await response.json();
      profileSelect.innerHTML = '';
      profiles.forEach((profile) => {
        const option = document.createElement('option');
        option.value = profile;
        option.textContent = profile;
        profileSelect.appendChild(option);
      });
    }
  } catch (error) {
    console.error('Error fetching profiles:', error);
  }
}

// 逐个检查每个用户配置的验证状态
async function checkVerifiedForEach() {
  for (const profile of profiles) {
    await checkVerified(profile);
    if (verified) break;
  }
}

// 检查是否已验证
async function checkVerified(profile) {
  try {
    const response = await fetch(`/api/profiles/${profile}/session`, { credentials: 'include' });
    if (response.ok) {
      const data = await response.json();
      if (data.verified) {
        verified = true;
        verified_profile = profile;
        updateUI(true, profile);
        fetchCodes();
        setupSSE();
      } else {
        verified = false;
        updateUI(false);
      }
    }
  } catch (error) {
    console.error('Error checking verification status:', error);
  }
}

function updateUI(isVerified, profileName = '') {
  if (isVerified) {
        verificationSection.style.display = 'none';
        codeSection.style.display = 'block';
        profileInfo.style.display = 'block';
      profileLabel.textContent = profileName;
    } else {
        verificationSection.style.display = 'flex';
        codeSection.style.display = 'none';
        profileInfo.style.display = 'none';
        profileLabel.textContent = '';
    }
}

// 验证 TOTP
async function verifyTotp() {
  const profile = profileSelect.value;
  const totp = totpInput.value;
  if (!totp || totp.length !== 6 || !/[0-9]{6}/.test(totp)) {
    verificationMessage.textContent = '请输入有效的验证码';
    return;
  }

  try {
    const response = await fetch(`/api/profiles/${profile}/session`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: totp })
    });

    if (response.ok) {
      totpInput.value = '';
      verificationMessage.textContent = '验证成功';
      setTimeout(() => { verificationMessage.textContent = ''; }, 5000);
      checkVerified(profile);
    } else {
      const errorData = await response.json();
      verificationMessage.textContent = errorData.error || '验证失败';
    }
  } catch (error) {
    console.error('Error verifying TOTP:', error);
  }
}

// 获取验证码
async function fetchCodes() {
  if (!verified) return;

  try {
    const response = await fetch(`/api/profiles/${verified_profile}/codes`, { credentials: 'include' });
    if (response.status === 403) {
      checkVerified(verified_profile);
      return;
    }
    const data = await response.json();
    renderCodes(data.codes || []);
  } catch (error) {
    console.error('Error fetching codes:', error);
  }
}

// 设置 SSE 实时监听
function setupSSE() {
  if (eventSource) eventSource.close();

  eventSource = new EventSource('/api/stream');
  eventSource.onmessage = (event) => {
    const data = JSON.parse(event.data);
    console.log('New message via SSE:', data);
    if (data.profile === verified_profile) {
      fetchCodes(); // 重新获取列表
      showNotification('收到新验证码');
    }
  };

  eventSource.onerror = () => {
    console.error('SSE Error, reconnecting...');
  };
}

function showNotification(msg) {
  // 简单的视觉反馈
  progressBar.style.width = '100%';
  setTimeout(() => { progressBar.style.width = '0%'; }, 2000);
}

// 注销登录
async function logout() {
  try {
    const response = await fetch(`/api/profiles/${verified_profile}/session`, {
      method: 'DELETE',
      credentials: 'include'
    });
    if (response.ok) {
      verified = false;
      if (eventSource) eventSource.close();
      updateUI(false);
    }
  } catch (error) {
    console.error('Error logging out:', error);
  }
}

function renderCodes(codes) {
  codeSection.innerHTML = '';
  codes.forEach(({ code, timestamp, sender }) => {
    const card = document.createElement('div');
    card.className = 'card';

    const senderElement = document.createElement('div');
    senderElement.className = 'sender';
    senderElement.innerHTML = `<i class="fa-solid fa-message"></i> ${sender || '未知发送者'}`;
    card.appendChild(senderElement);

    const codeElement = document.createElement('div');
    codeElement.className = 'code';
    codeElement.textContent = code;
    card.appendChild(codeElement);

    const metaElement = document.createElement('div');
    metaElement.className = 'meta';
    metaElement.textContent = `发送于 ${formatTimestamp(timestamp)}`;
    card.appendChild(metaElement);

    const actions = document.createElement('div');
    actions.className = 'actions';
    const timeButton = document.createElement('button');
    const currentTime = Date.now() / 1000;
    const diff = currentTime - timestamp;
    let timeText = diff < 60 ? '刚刚' : diff < 3600 ? `${Math.floor(diff / 60)} 分钟前` : diff < 86400 ? `${Math.floor(diff / 3600)} 小时前` : '很久以前';
    timeButton.innerHTML = `<i class="fas fa-clock"></i> ${timeText}`;
    actions.appendChild(timeButton);
    card.appendChild(actions);

    const copyButton = document.createElement('button');
    copyButton.className = 'copy-button';
    copyButton.innerHTML = `<i class="fas fa-copy"></i> 复制`;
    copyButton.onclick = () => {
      navigator.clipboard.writeText(code).then(() => {
        copyButton.classList.add('copied');
        copyButton.innerHTML = `<i class="fas fa-check"></i> 已复制`;
        setTimeout(() => {
          copyButton.classList.remove('copied');
          copyButton.innerHTML = `<i class="fas fa-copy"></i> 复制`;
        }, 3000);
      });
    };
    card.appendChild(copyButton);
    codeSection.appendChild(card);
  });
}

verifyButton.addEventListener('click', verifyTotp);
logoutButton.addEventListener('click', logout);

(async () => {
  await fetchProfiles();
  checkVerifiedForEach();
})();
