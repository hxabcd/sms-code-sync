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

// 时间格式化函数
function formatTimestamp(timestamp) {
  const date = new Date(timestamp * 1000);
  return `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')} ` +
    `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:${String(date.getSeconds()).padStart(2, '0')}`;
}

// 获取可用的用户配置
async function fetchProfiles() {
  try {
    const response = await fetch('/list-profiles');
    if (response.ok) {
      profiles = await response.json();
      console.log('Profiles:', profiles);
      profiles.forEach((profile) => {
        const option = document.createElement('option');
        option.value = profile;
        option.textContent = profile;
        profileSelect.appendChild(option);
      });
    } else {
      console.error(`获取用户配置失败，状态码：${response.status}`);
    }
  } catch (error) {
    console.error('Error fetching profiles:', error);
  }
}

// 逐个检查每个用户配置的验证状态
async function checkVerifiedForEach() {
  console.log('Checking verification status for each profile...');
  for (const profile of profiles) {
    await checkVerified(profile);
    if (verified) {
      console.log(`Verified! Breaking...`);
      break;
    }
  }
}

// 检查是否已验证
async function checkVerified(profile) {
  console.log(`Checking verification status for profile: ${profile}`);
  try {
    const response = await fetch(`/check-verified?profile=${profile}`, { credentials: 'include' });
    if (response.ok) {
      const data = await response.json();
      if (data.status) {
        console.log(`Verified for profile: ${profile}`);
        verified = true;
        verified_profile = profile;
        verificationSection.style.display = 'none';
        codeSection.style.display = 'block';
        profileInfo.style.display = 'block';
        profileLabel.textContent = profile;
        fetchCodes();
      } else {
        console.log(`Can not verify for profile: ${profile}`);
        verified = false;
        verificationSection.style.display = 'flex';
        codeSection.style.display = 'none';
        profileInfo.style.display = 'none';
        profileLabel.textContent = '';
      }
    } else {
      console.error(`检查验证状态失败，状态码：${response.status}`);
    }
  } catch (error) {
    console.error('Error checking verification status:', error);
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

  console.log(`Verifying for profile: ${profile} with TOTP: ${totp}`);
  try {
    const response = await fetch('/verify', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ profile: profile, token: totp })
    });

    if (response.ok) {
      totpInput.value = '';
      verificationMessage.textContent = '验证成功';
      setTimeout(() => {
        verificationMessage.textContent = ''; // 清除验证消息
      }, 5000);
      checkVerified(profile);
    } else {
      const errorData = await response.json();
      verificationMessage.textContent = errorData.error || '验证失败';
    }
  } catch (error) {
    console.error('Error verifying TOTP:', error);
    verificationMessage.textContent = `验证失败，请稍后再试\n错误信息:\n${error}`;
  }
}

// 获取验证码
async function fetchCodes() {
  progressBar.style.width = '0%'; // 重置进度条
  let progress = 0;

  const interval = setInterval(() => {
    if (!verified) {
      progressBar.style.width = '0%'; // 重置进度条
      clearInterval(interval); // 清除进度条动画
      return;
    }
    progress += 20;
    progressBar.style.width = `${progress}%`;
    if (progress >= 100) {
      clearInterval(interval);
    }
  }, 1000); 

  try {
    const response = await fetch(`/get-codes?profile=${verified_profile}`, { credentials: 'include' });
    if (response.status === 403) {
      checkVerified(verified_profile);
      return;
    }

    const data = await response.json();
    renderCodes(data.codes || []);
  } catch (error) {
    console.error('Error fetching codes:', error);
  }

  setTimeout(fetchCodes, 5000); // 每 5 秒获取一次验证码
}

// 注销登录
async function logout() {
  try {
    const response = await fetch(`/logout?profile=${verified_profile}`, { credentials: 'include' });
    if (response.ok) {
      checkVerified(verified_profile)
    } else {
      console.error('注销失败：', response.statusText);
    }
  } catch (error) {
    console.error('Error logging out:', error);
  }
}

// 渲染验证码卡片
function renderCodes(codes) {
  codeSection.innerHTML = ''; // 清空现有内容
  codes.forEach(({ code, timestamp, sender }) => {
    const card = document.createElement('div');
    card.className = 'card';

    // 发送者信息
    const senderElement = document.createElement('div');
    senderElement.className = 'sender';
    senderElement.innerHTML = `<i class="fa-solid fa-message"></i> ${sender || '未知发送者'}`;
    card.appendChild(senderElement);

    // 验证码
    const codeElement = document.createElement('div');
    codeElement.className = 'code';
    codeElement.textContent = code;
    card.appendChild(codeElement);

    // 时间元信息
    const metaElement = document.createElement('div');
    metaElement.className = 'meta';
    metaElement.textContent = `发送于 ${formatTimestamp(timestamp)}`;
    card.appendChild(metaElement);

    // 时间按钮
    const actions = document.createElement('div');
    actions.className = 'actions';

    const timeButton = document.createElement('button');
    const currentTime = Date.now() / 1000;
    const timeDifference = currentTime - timestamp;
    let timeText;
    if (timeDifference < 60) {
        timeText = '刚刚';
    } else if (timeDifference < 3600) {
        timeText = `${Math.floor(timeDifference / 60)} 分钟前`;
    } else if (timeDifference < 86400) {
        timeText = `${Math.floor(timeDifference / 3600)} 小时前`;
    } else {
        timeText = `${Math.floor(timeDifference / 86400)} 天前`;
    }
    timeButton.innerHTML = `<i class="fas fa-clock"></i> ${timeText}`;

    actions.appendChild(timeButton);
    card.appendChild(actions);

    // 复制按钮（悬浮于右下角）
    const copyButton = document.createElement('button');
    copyButton.className = 'copy-button';
    copyButton.innerHTML = `<i class="fas fa-copy"></i> 复制`;
    copyButton.onclick = () => {
      navigator.clipboard.writeText(code).then(() => {
        // 按钮变绿，显示“已复制”
        copyButton.classList.add('copied');
        copyButton.innerHTML = `<i class="fas fa-check"></i> 已复制`;

        // 3秒后恢复原状态
        setTimeout(() => {
          copyButton.classList.remove('copied');
          copyButton.innerHTML = `<i class="fas fa-copy"></i> 复制`;
        }, 3000);
      }).catch(() => {
        // 如果复制失败，保持原状或显示错误提示
        console.error('复制失败，请手动复制');
      });
    };
    card.appendChild(copyButton);

    // 将卡片添加到验证码显示区域
    codeSection.appendChild(card);
  });
}


// 事件绑定
verifyButton.addEventListener('click', verifyTotp);
logoutButton.addEventListener('click', logout);

// 初始化
(async () => {
  try {
    await fetchProfiles();
    checkVerifiedForEach();
  } catch (error) {
    console.error('Initialization error:', error);
  }
})();
