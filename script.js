// ----------------------------------------------------
// 전역 변수 (Global Variables)
// ----------------------------------------------------
const ADMIN_UID = "jaGugunGReXytCgbqYwQUybxyJL2"; 
let currentUserProfile = null;
let globalTasksData = {};
let globalTripsData = {};
let globalLeavesData = {};
let globalUsersData = {};
let globalNoticesData = {};
let currentViewMode = 'status';
let currentDateForCalendar = new Date();
let currentDateForGantt = new Date();
let currentDateForModalCalendar = new Date();

// ----------------------------------------------------
// Firebase 설정
// ----------------------------------------------------
const firebaseConfig = {
    apiKey: "AIzaSyBOIugED48GlLzHytc6p4XDbrJVzouA4Q8",
    authDomain: "coworking-tool.firebaseapp.com",
    projectId: "coworking-tool",
    storageBucket: "coworking-tool.firebasestorage.app",
    messagingSenderId: "614190014572",
    appId: "1:614190014572:web:ef61d476457cdc1ef27849",
    measurementId: "G-B4RSYQ38P8"
};

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

const auth = firebase.auth();
const provider = new firebase.auth.GoogleAuthProvider();
const db = firebase.database();
const storage = firebase.storage();

// ----------------------------------------------------
// 다크 모드 & 테마 & 달력 설정
// ----------------------------------------------------
function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    document.getElementById('theme-toggle').innerHTML = savedTheme === 'dark' ? '<span class="material-symbols-rounded">light_mode</span>' : '<span class="material-symbols-rounded">dark_mode</span>';
    const flatpickrTheme = document.getElementById('flatpickr-theme');
    if (savedTheme === 'dark' && flatpickrTheme) {
        flatpickrTheme.href = "https://cdn.jsdelivr.net/npm/flatpickr/dist/themes/dark.css";
    }
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    document.getElementById('theme-toggle').innerHTML = newTheme === 'dark' ? '<span class="material-symbols-rounded">light_mode</span>' : '<span class="material-symbols-rounded">dark_mode</span>';
    const flatpickrTheme = document.getElementById('flatpickr-theme');
    if (flatpickrTheme) {
        flatpickrTheme.href = newTheme === 'dark' ? "https://cdn.jsdelivr.net/npm/flatpickr/dist/themes/dark.css" : "https://cdn.jsdelivr.net/npm/flatpickr/dist/flatpickr.min.css";
    }
}

initTheme();

const fpConfig = {
    locale: "ko",
    dateFormat: "Y-m-d",
    disableMobile: true,
    monthSelectorType: "static"
};
flatpickr("#modalStartDate", fpConfig);
flatpickr("#modalDueDate", fpConfig);
flatpickr("#tripDate", fpConfig);
flatpickr("#leaveStartDate", fpConfig);
flatpickr("#leaveEndDate", fpConfig);
flatpickr("#mapStartDate", fpConfig);
flatpickr("#mapEndDate", fpConfig);

// ----------------------------------------------------
// 공통 알림 모달 & 토스트 알림
// ----------------------------------------------------
function customModalAction(type, message, defaultValue = '') {
    return new Promise((resolve) => {
        const modal = document.getElementById('alertModal');
        const msgEl = document.getElementById('alertMessage');
        const inputEl = document.getElementById('alertInput');
        const confirmBtn = document.getElementById('alertConfirmBtn');
        const cancelBtn = document.getElementById('alertCancelBtn');

        msgEl.textContent = message;
        modal.style.display = 'flex';

        if (type === 'prompt') {
            inputEl.style.display = 'block';
            inputEl.value = defaultValue;
            setTimeout(() => inputEl.focus(), 10);
        } else {
            inputEl.style.display = 'none';
        }

        cancelBtn.style.display = type === 'alert' ? 'none' : 'block';
        cancelBtn.style.flex = '1';

        confirmBtn.onclick = () => {
            modal.style.display = 'none';
            resolve(type === 'prompt' ? inputEl.value : true);
        };

        cancelBtn.onclick = () => {
            modal.style.display = 'none';
            resolve(type === 'prompt' ? null : false);
        };
    });
}
const customAlert = (msg) => customModalAction('alert', msg);
const customConfirm = (msg) => customModalAction('confirm', msg);
const customPrompt = (msg, def) => customModalAction('prompt', msg, def);

function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    let icon = 'info';
    let iconColor = 'var(--primary)';
    if (type === 'warning') {
        icon = 'notifications_active';
        iconColor = '#F59E0B';
    }
    
    toast.innerHTML = `
        <span class="material-symbols-rounded" style="color: ${iconColor}; font-size: 1.8rem;">${icon}</span>
        <span style="font-size: 0.95rem; font-weight: 600; line-height: 1.5; white-space: pre-wrap;">${message}</span>
    `;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.add('fade-out');
        toast.addEventListener('animationend', () => toast.remove());
    }, 5000);
}

function switchTab(tabId, element) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.style.display = 'none');
    
    if (element) element.classList.add('active');
    document.getElementById(tabId).style.display = 'block';
}

// ----------------------------------------------------
// 인증 (로그인/로그아웃) 및 관리자 제어
// ----------------------------------------------------
function loginWithGoogle() {
    auth.signInWithPopup(provider).then((result) => {
        console.log("로그인 성공:", result.user.displayName);
    }).catch(async (error) => {
        console.error("로그인 에러:", error);
        if (error.code === 'auth/unauthorized-domain' || error.message.includes('disallowed_useragent')) {
            await customAlert('보안 정책에 따라 앱 내장 브라우저에서는 로그인이 제한됩니다.\n\n우측 상단 메뉴(점 3개)를 눌러 [다른 브라우저로 열기] 또는 [Chrome에서 열기]를 선택해 주세요!');
        } else {
            await customAlert('로그인에 실패했습니다. (' + error.message + ')');
        }
    });
}

async function logout() {
    if(await customConfirm('로그아웃 하시겠습니까?')) { auth.signOut(); }
}

auth.onAuthStateChanged((user) => {
    if (user) {
        const userRef = db.ref('users/' + user.uid);
        userRef.on('value', (snapshot) => {
            if (!snapshot.exists()) {
                const newProfile = {
                    displayName: user.displayName, email: user.email, photoURL: user.photoURL || '',
                    approved: user.uid === ADMIN_UID, leaveTotal: 15
                };
                userRef.set(newProfile);
                currentUserProfile = newProfile;
            } else {
                currentUserProfile = snapshot.val();
                if (user.uid === ADMIN_UID && !currentUserProfile.approved) {
                    db.ref('users/' + user.uid).update({ approved: true });
                    currentUserProfile.approved = true;
                }
            }
            if(typeof renderLeaveUI === 'function') renderLeaveUI();
            if(typeof renderMyPage === 'function') renderMyPage();
            if(typeof setupPrivateChatNotificationListeners === 'function') setupPrivateChatNotificationListeners();

            updateUIPermissions(user, currentUserProfile);

            if (user.uid === ADMIN_UID) {
                document.getElementById('tab-btn-admin').style.display = 'inline-block';
                listenForUsers(); 
                if(typeof renderAdminLeaves === 'function') renderAdminLeaves();
            } else {
                document.getElementById('tab-btn-admin').style.display = 'none';
            }
        });
    } else {
        currentUserProfile = null;
        updateUIPermissions(null, null);
        if (document.getElementById('tab-btn-admin')) document.getElementById('tab-btn-admin').style.display = 'none';
        if(typeof renderMyPage === 'function') renderMyPage();
        switchTab('tab-tasks', document.querySelector('.tab-btn'));
    }
});

function updateUIPermissions(user, profile) {
    const loginBtn = document.getElementById('login-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const userInfo = document.getElementById('user-info');
    const userAvatar = document.getElementById('user-avatar');
    const controls = [document.getElementById('taskInput'), document.querySelector('.task-input-area button'), document.getElementById('assigneeInput'), document.getElementById('priorityInput'), document.getElementById('fileInput'), document.querySelector('.upload-area button'), document.getElementById('addTripBtn'), document.getElementById('addNoticeBtn')];

    const isLoggedIn = !!user;
    const isApproved = isLoggedIn && profile && profile.approved;

    loginBtn.style.display = isLoggedIn ? 'none' : 'inline-block';
    logoutBtn.style.display = isLoggedIn ? 'inline-block' : 'none';

    if (isLoggedIn) {
        userAvatar.src = user.photoURL || "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1 1'%3E%3Crect width='1' height='1' fill='%23E5E7EB'/%3E%3C/svg%3E";
        userAvatar.style.display = 'block';
        
        if (isApproved) {
            userInfo.textContent = `${user.displayName}님 환영합니다!`;
            controls.forEach(el => { if (el) el.disabled = false; });
            if (typeof quill !== 'undefined') quill.enable(true);
        } else {
            userInfo.textContent = `관리자의 승인을 기다리고 있습니다.`;
            controls.forEach(el => { if (el) el.disabled = true; });
            if (typeof quill !== 'undefined') quill.enable(false);
        }
    } else {
        userInfo.textContent = '';
        userAvatar.style.display = 'none';
        controls.forEach(el => { if (el) el.disabled = true; });
        if (typeof quill !== 'undefined') quill.enable(false);
    }
}

function updateFileName(inputId, displayId) {
    const input = document.getElementById(inputId);
    const display = document.getElementById(displayId);
    if (input.files.length > 0) {
        display.textContent = input.files[0].name;
    } else {
        if (inputId === 'fileInput') {
            display.textContent = '선택된 파일 없음';
        } else {
            const existingUrl = input.dataset.existingUrl;
            display.textContent = existingUrl ? `현재 첨부됨: ${input.dataset.existingPath.split('_').pop()}` : '';
        }
    }
}

function listenForUsers() {
    db.ref('users').on('value', (snapshot) => {
        const approvalListEl = document.getElementById('user-approval-list');
        const memberListEl = document.getElementById('user-member-list');
        approvalListEl.innerHTML = '';
        memberListEl.innerHTML = '';
        
        const users = snapshot.val();
        if (!users) {
            approvalListEl.innerHTML = '<li>대기 중인 사용자가 없습니다.</li>';
            memberListEl.innerHTML = '<li>멤버가 없습니다.</li>';
            return;
        }

        let pendingCount = 0, memberCount = 0;
        Object.keys(users).forEach(uid => {
            const user = users[uid];
            const li = document.createElement('li');
            const safeName = user.displayName ? user.displayName.replace(/'/g, "\\'") : '이름없음';
            
            if (!user.approved) {
                li.innerHTML = `<span>${user.displayName} <small style="color: var(--text-muted); font-weight: normal;">(${user.email})</small></span><button onclick="approveUser('${uid}', '${safeName}')">승인</button>`;
                approvalListEl.appendChild(li); pendingCount++;
            } else {
                const actionBtn = uid === ADMIN_UID ? `<span style="font-size: 0.8rem; color: var(--primary); font-weight: bold;">최고 관리자</span>` : `<button class="revoke-btn" onclick="revokeUser('${uid}', '${safeName}')">해제</button>`;
                li.innerHTML = `<span>${user.displayName} <small style="color: var(--text-muted); font-weight: normal;">(${user.email})</small></span>${actionBtn}`;
                memberListEl.appendChild(li); memberCount++;
            }
        });
        if (pendingCount === 0) approvalListEl.innerHTML = '<li>승인 대기 중인 사용자가 없습니다.</li>';
        if (memberCount === 0) memberListEl.innerHTML = '<li>현재 워크스페이스에 참여 중인 멤버가 없습니다.</li>';
    });
}

async function approveUser(uid, name) {
    if (await customConfirm(`'${name}' 사용자의 수정을 허용하시겠습니까?`)) {
        db.ref('users/' + uid).update({ approved: true }).catch(async (error) => await customAlert("승인 실패: " + error.message));
    }
}

async function revokeUser(uid, name) {
    if (await customConfirm(`'${name}' 사용자의 권한을 해제하시겠습니까?`)) {
        db.ref('users/' + uid).update({ approved: false }).catch(async (error) => await customAlert("해제 실패: " + error.message));
    }
}

// ----------------------------------------------------
// 마이페이지 개인정보 수정 기능
// ----------------------------------------------------
function openProfileModal() {
    if (!currentUserProfile) return;
    document.getElementById('profileNameInput').value = currentUserProfile.displayName || '';
    document.getElementById('profileDeptInput').value = currentUserProfile.department || 'unassigned';
    document.getElementById('profileModal').style.display = 'flex';
}

function closeProfileModal() {
    document.getElementById('profileModal').style.display = 'none';
}

async function saveProfile() {
    if (!auth.currentUser) return;
    const newName = document.getElementById('profileNameInput').value.trim();
    const newDept = document.getElementById('profileDeptInput').value;
    
    if (!newName) return await customAlert('이름을 입력해주세요.');
    
    try {
        await db.ref('users/' + auth.currentUser.uid).update({ displayName: newName, department: newDept });
        await auth.currentUser.updateProfile({ displayName: newName });
        closeProfileModal();
        showToast('개인정보가 성공적으로 수정되었습니다.', 'info');
    } catch (error) {
        console.error(error);
        await customAlert('수정 실패: ' + error.message);
    }
}

// ----------------------------------------------------
// 1. 업무 현황 (칸반, 달력, 간트)
// ----------------------------------------------------
async function addTask() {
    const input = document.getElementById('taskInput');
    const title = input.value.trim();
    const assigneeInput = document.getElementById('assigneeInput');
    const assignee = assigneeInput.value.trim();
    const priorityInput = document.getElementById('priorityInput');
    const priority = priorityInput.value;

    if (!currentUserProfile || !currentUserProfile.approved) return await customAlert('관리자의 승인 후 업무를 추가할 수 있습니다.');
    if (!title) return await customAlert('업무 내용을 입력해주세요!');

    const currentUser = auth.currentUser;
    const authorName = currentUser ? currentUser.displayName : '익명';
    const today = new Date();
    const startDateString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    const newTaskRef = db.ref('tasks').push();
    newTaskRef.set({ id: newTaskRef.key, title: title, status: 'todo', author: authorName, assignee: assignee, priority: priority, startDate: startDateString })
        .catch(async (error) => await customAlert("추가 실패: " + error.message));
    
    input.value = ''; assigneeInput.value = ''; priorityInput.value = 'medium';
    document.getElementById('searchAssignee').value = '';
    document.getElementById('dateFilter').value = 'all';

    if (currentViewMode === 'calendar') {
        document.getElementById('viewMode').value = 'status';
        toggleViewMode();
        customAlert("달력에는 마감일이 있는 업무만 표시됩니다. \n방금 추가한 업무 확인을 위해 '상태별 보기'로 전환했습니다!");
    } else {
        filterTasks(); 
    }
}

document.getElementById('taskInput').addEventListener('keypress', function(e) { if (e.key === 'Enter') addTask(); });
document.getElementById('assigneeInput').addEventListener('keypress', function(e) { if (e.key === 'Enter') addTask(); });

async function deleteTask(id) {
    if (!currentUserProfile || !currentUserProfile.approved) return await customAlert('승인된 사용자만 삭제할 수 있습니다.');
    if(await customConfirm('이 업무를 삭제할까요?')) { db.ref('tasks/' + id).remove(); }
}

function allowDrop(ev) { ev.preventDefault(); }
function drag(ev, id) { ev.dataTransfer.setData("text", id); }
async function drop(ev, newStatus) {
    ev.preventDefault();
    const taskId = ev.dataTransfer.getData("text");
    if (taskId) { 
        if (!currentUserProfile || !currentUserProfile.approved) return await customAlert('승인된 사용자만 상태를 변경할 수 있습니다.');
        db.ref('tasks/' + taskId).update({ status: newStatus }).catch(async (error) => await customAlert("상태 변경 실패: " + error.message));
    }
}

function filterTasks() {
    const searchTerm = document.getElementById('searchAssignee').value.toLowerCase().trim();
    const dateFilter = document.getElementById('dateFilter').value;
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfWeek = new Date(today); endOfWeek.setDate(today.getDate() + (6 - today.getDay()));
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    const counts = { todo: 0, doing: 0, done: 0, week: 0, month: 0, later: 0 };

    document.querySelectorAll('.task-card').forEach(card => {
        const assignee = card.dataset.assignee.toLowerCase();
        const dueDateStr = card.dataset.dueDate;
        let nameMatch = assignee.includes(searchTerm);
        let dateMatch = true;

        if (dateFilter !== 'all') {
            if (!dueDateStr) dateMatch = false;
            else {
                const taskDate = new Date(dueDateStr); taskDate.setHours(0, 0, 0, 0);
                if (dateFilter === 'today') dateMatch = taskDate <= today;
                else if (dateFilter === 'week') dateMatch = taskDate <= endOfWeek;
                else if (dateFilter === 'month') dateMatch = taskDate <= endOfMonth;
            }
        }
        if (nameMatch && dateMatch) { 
            card.style.display = 'flex'; 
            if (card.parentElement) {
                const colId = card.parentElement.id.replace('-list', '');
                if (counts[colId] !== undefined) counts[colId]++;
            }
        } else { card.style.display = 'none'; }
    });

    Object.keys(counts).forEach(col => {
        const badge = document.getElementById(`count-${col}`);
        if (badge) badge.textContent = counts[col];
    });

    document.querySelectorAll('.calendar-task').forEach(taskEl => {
        if (taskEl.dataset.assignee.toLowerCase().includes(searchTerm)) taskEl.style.display = 'block';
        else taskEl.style.display = 'none';
    });

    document.querySelectorAll('.gantt-row').forEach(row => {
        const tripGroups = row.querySelectorAll('.gantt-trip-group');
        if (tripGroups.length > 0) {
            let rowHasVisibleTrip = false;
            tripGroups.forEach(bar => {
                if ((bar.dataset.assignee || '').toLowerCase().includes(searchTerm)) {
                    bar.style.display = 'flex'; rowHasVisibleTrip = true;
                } else bar.style.display = 'none';
            });
            row.style.display = rowHasVisibleTrip ? 'flex' : 'none';
        } else {
            if ((row.dataset.assignee || '').toLowerCase().includes(searchTerm)) row.style.display = 'flex';
            else row.style.display = 'none';
        }
    });

    document.querySelectorAll('.trip-card').forEach(card => {
        const assignee = (card.dataset.assignee || '').toLowerCase();
        const dateStr = card.dataset.date;
        let nameMatch = assignee.includes(searchTerm);
        let dateMatch = true;

        if (dateFilter !== 'all') {
            if (!dateStr) dateMatch = false;
            else {
                const tripDate = new Date(dateStr); tripDate.setHours(0, 0, 0, 0);
                if (dateFilter === 'today') dateMatch = tripDate <= today;
                else if (dateFilter === 'week') dateMatch = tripDate <= endOfWeek;
                else if (dateFilter === 'month') dateMatch = tripDate <= endOfMonth;
            }
        }
        if (nameMatch && dateMatch) card.style.display = 'flex'; 
        else card.style.display = 'none';
    });
}

let currentModalTaskId = null;
function openModal(taskId, title, description, dueDate, startDate) {
    currentModalTaskId = taskId;
    document.getElementById('modalTitleInput').value = title;
    document.getElementById('modalDescription').value = description || '';
    document.getElementById('modalStartDate').value = startDate || '';
    document.getElementById('modalDueDate').value = dueDate || '';
    document.getElementById('taskModal').style.display = 'flex';
}

function closeModal() { document.getElementById('taskModal').style.display = 'none'; currentModalTaskId = null; }

async function saveDescription() {
    if (!currentUserProfile || !currentUserProfile.approved) return await customAlert('승인된 사용자만 저장할 수 있습니다.');
    if (!currentModalTaskId) return;
    
    const newTitle = document.getElementById('modalTitleInput').value.trim();
    if (!newTitle) return await customAlert('업무 제목을 입력해주세요.');
    
    db.ref('tasks/' + currentModalTaskId).update({
        title: newTitle, description: document.getElementById('modalDescription').value.trim(),
        startDate: document.getElementById('modalStartDate').value, dueDate: document.getElementById('modalDueDate').value
    }).then(() => closeModal()).catch(async error => await customAlert("저장 실패: " + error.message));
}

document.getElementById('taskModal').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA' && e.target.tagName !== 'BUTTON') { e.preventDefault(); saveDescription(); }
});
document.getElementById('tripModal').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA' && e.target.tagName !== 'BUTTON') { e.preventDefault(); saveTrip(); }
});

function openCommonCalendarModal() { document.getElementById('commonCalendarModal').style.display = 'flex'; renderModalCalendar(); }
function closeCommonCalendarModal() { document.getElementById('commonCalendarModal').style.display = 'none'; }
function changeModalMonth(offset) { currentDateForModalCalendar.setMonth(currentDateForModalCalendar.getMonth() + offset); renderModalCalendar(); }

function renderModalCalendar() {
    const priorityWeight = { 'high': 3, 'medium': 2, 'low': 1 };
    const tasksArray = Object.values(globalTasksData).sort((a, b) => (priorityWeight[b.priority] || 2) - (priorityWeight[a.priority] || 2));
    const tripsArray = Object.values(globalTripsData).map(t => ({ ...t, isTrip: true, title: `⚑ [출장] ${t.name}`, startDate: t.date, dueDate: t.date, status: 'todo' }));
    const leavesArray = Object.values(globalLeavesData).filter(l => l.status === 'approved').map(l => ({
        id: l.id, isLeave: true, title: `[휴가] ${l.userName}`, name: `[휴가] ${l.userName}`,
        assignee: l.userName, startDate: l.date, dueDate: l.date, status: 'todo', priority: 'medium'
    }));
    const combinedArray = [...tasksArray, ...tripsArray, ...leavesArray];

    const grid = document.getElementById('modal-calendar-grid');
    grid.innerHTML = '';
    const year = currentDateForModalCalendar.getFullYear(), month = currentDateForModalCalendar.getMonth();
    document.getElementById('modal-calendar-month-year').textContent = `${year}년 ${month + 1}월`;
    
    const firstDay = new Date(year, month, 1).getDay(), daysInMonth = new Date(year, month + 1, 0).getDate();
    ['일', '월', '화', '수', '목', '금', '토'].forEach((day, index) => {
        const h = document.createElement('div'); h.className = `calendar-day-header ${index===0?'sun':index===6?'sat':''}`; h.textContent = day; grid.appendChild(h);
    });
    
    let currentDay = 1, nextMonthDay = 1, today = new Date();
    for (let i = 0; i < 42; i++) {
        const cell = document.createElement('div'); cell.className = 'calendar-day';
        let cellDate;
        if (i < firstDay) { cell.classList.add('other-month'); const d = new Date(year, month, 0).getDate() - firstDay + i + 1; cell.innerHTML = `<div class="calendar-date">${d}</div>`; cellDate = new Date(year, month - 1, d); }
        else if (currentDay <= daysInMonth) {
            if (year === today.getFullYear() && month === today.getMonth() && currentDay === today.getDate()) cell.classList.add('today');
            cell.innerHTML = `<div class="calendar-date">${currentDay}</div>`; cellDate = new Date(year, month, currentDay); currentDay++;
        } else { cell.classList.add('other-month'); cell.innerHTML = `<div class="calendar-date">${nextMonthDay}</div>`; cellDate = new Date(year, month + 1, nextMonthDay); nextMonthDay++; }
        
        const dateString = `${cellDate.getFullYear()}-${String(cellDate.getMonth() + 1).padStart(2, '0')}-${String(cellDate.getDate()).padStart(2, '0')}`;
        
        combinedArray.forEach(task => {
            if (task.dueDate === dateString) {
                const el = document.createElement('div'); el.className = 'calendar-task'; el.title = task.title;
                let statusIcon = task.isLeave ? '🌴 ' : (!task.isTrip && task.status === 'done' ? '✓ ' : '');
                el.textContent = statusIcon + task.title;
                el.style.backgroundColor = task.isLeave ? '#10B981' : task.isTrip ? '#8B5CF6' : (task.priority === 'high' ? 'var(--danger)' : task.priority === 'low' ? '#10B981' : '#F59E0B');
                if (task.status === 'done' && !task.isTrip) el.classList.add('task-done-style');
                
                el.onclick = () => {
                    closeCommonCalendarModal();
                    if (task.isLeave) customAlert(`🌴 휴가: ${task.assignee}`);
                    else if (task.isTrip) openTripModal(task.id, task.name, task.date, task.assignee, task.contact, task.address, task.scheduleUrl, task.schedulePath, task.qrUrl, task.qrPath);
                    else openModal(task.id, task.title, task.description, task.dueDate, task.startDate);
                };
                cell.appendChild(el);
            }
        });
        grid.appendChild(cell);
    }
}

function toggleViewMode() {
    currentViewMode = document.getElementById('viewMode').value;
    ['board-status', 'board-timeline', 'board-calendar', 'board-gantt'].forEach(id => document.getElementById(id).style.display = 'none');
    document.getElementById(`board-${currentViewMode}`).style.display = currentViewMode === 'gantt' ? 'block' : 'flex';
    renderTasks();
}
function changeMonth(offset) { currentDateForCalendar.setMonth(currentDateForCalendar.getMonth() + offset); renderTasks(); }
function changeGanttMonth(offset) { currentDateForGantt.setMonth(currentDateForGantt.getMonth() + offset); renderTasks(); }

function renderCalendar(tasksArray) {
    const grid = document.getElementById('calendar-grid'); grid.innerHTML = '';
    const year = currentDateForCalendar.getFullYear(), month = currentDateForCalendar.getMonth();
    document.getElementById('calendar-month-year').textContent = `${year}년 ${month + 1}월`;
    const firstDay = new Date(year, month, 1).getDay(), daysInMonth = new Date(year, month + 1, 0).getDate();
    ['일', '월', '화', '수', '목', '금', '토'].forEach((day, index) => {
        const h = document.createElement('div'); h.className = `calendar-day-header ${index===0?'sun':index===6?'sat':''}`; h.textContent = day; grid.appendChild(h);
    });
    
    let currentDay = 1, nextMonthDay = 1, today = new Date();
    for (let i = 0; i < 42; i++) {
        const cell = document.createElement('div'); cell.className = 'calendar-day';
        let cellDate;
        if (i < firstDay) { cell.classList.add('other-month'); const d = new Date(year, month, 0).getDate() - firstDay + i + 1; cell.innerHTML = `<div class="calendar-date">${d}</div>`; cellDate = new Date(year, month - 1, d); }
        else if (currentDay <= daysInMonth) { if (year === today.getFullYear() && month === today.getMonth() && currentDay === today.getDate()) cell.classList.add('today'); cell.innerHTML = `<div class="calendar-date">${currentDay}</div>`; cellDate = new Date(year, month, currentDay); currentDay++; }
        else { cell.classList.add('other-month'); cell.innerHTML = `<div class="calendar-date">${nextMonthDay}</div>`; cellDate = new Date(year, month + 1, nextMonthDay); nextMonthDay++; }
        
        const dateString = `${cellDate.getFullYear()}-${String(cellDate.getMonth() + 1).padStart(2, '0')}-${String(cellDate.getDate()).padStart(2, '0')}`;
        
        tasksArray.forEach(task => {
            if (task.dueDate === dateString) {
                const el = document.createElement('div'); el.className = 'calendar-task'; el.title = task.title; el.dataset.assignee = task.assignee || '미지정';
                el.innerHTML = task.isLeave ? '<span class="material-symbols-rounded" style="font-size:1.1em; margin-right:4px;">beach_access</span>' : (task.isTrip ? '<span class="material-symbols-rounded" style="font-size:1.1em; margin-right:4px;">flight_takeoff</span>' : (task.status === 'done' ? '<span class="material-symbols-rounded" style="font-size:1.1em; margin-right:4px;">check_circle</span>' : ''));
                el.appendChild(document.createTextNode(task.title));
                el.style.backgroundColor = task.isLeave ? '#10B981' : task.isTrip ? '#8B5CF6' : (task.priority === 'high' ? 'var(--danger)' : task.priority === 'low' ? '#10B981' : '#F59E0B');
                if (task.status === 'done' && !task.isTrip) el.classList.add('task-done-style');
                
                el.onclick = () => {
                    if (task.isLeave) customAlert(`🌴 휴가: ${task.assignee}`);
                    else if (task.isTrip) openTripModal(task.id, task.name, task.date, task.assignee, task.contact, task.address, task.scheduleUrl, task.schedulePath, task.qrUrl, task.qrPath);
                    else openModal(task.id, task.title, task.description, task.dueDate, task.startDate);
                };
                cell.appendChild(el);
            }
        });
        grid.appendChild(cell);
    }
}

function openTripGroupModal(titleText, items) {
    document.getElementById('tripGroupTitle').textContent = titleText;
    const listEl = document.getElementById('tripGroupList'); listEl.innerHTML = '';
    items.forEach(item => {
        const li = document.createElement('li'); li.style.cursor = 'pointer';
        let icon = item.isLeave ? 'beach_access' : (item.isTrip ? 'flight_takeoff' : 'radio_button_unchecked');
        if (!item.isTrip && !item.isLeave) { if (item.status === 'doing') icon = 'pending'; if (item.status === 'done') icon = 'check_circle'; }
        const color = item.isLeave ? '#10B981' : (item.isTrip ? '#8B5CF6' : 'var(--text-main)');
        const titleToDisplay = item.isLeave || item.isTrip ? item.name : item.title;
        const subtitle = item.isLeave || item.isTrip ? `<span class="material-symbols-rounded" style="font-size:1.1em;">person</span> ${item.assignee || '미지정'} | <span class="material-symbols-rounded" style="font-size:1.1em;">location_on</span> ${item.address || '주소 미입력'}` : `<span class="material-symbols-rounded" style="font-size:1.1em;">person</span> ${item.assignee || '미지정'} | 중요도: ${item.priority === 'high' ? '높음' : (item.priority === 'low' ? '낮음' : '보통')}`;
        
        li.innerHTML = `<div style="display: flex; flex-direction: column; gap: 0.3rem;"><span style="color: ${color}; font-size: 0.95rem; font-weight: 600; display:flex; align-items:center;"><span class="material-symbols-rounded" style="font-size:1.2em; margin-right:4px;">${icon}</span> ${titleToDisplay}</span><span style="font-size: 0.8rem; color: var(--text-muted); font-weight: normal;">${subtitle}</span></div>`;
        li.onclick = () => {
            closeTripGroupModal();
            if (item.isLeave) customAlert(`🌴 휴가: ${item.assignee}`);
            else if (item.isTrip) openTripModal(item.id, item.name, item.date, item.assignee, item.contact, item.address, item.scheduleUrl, item.schedulePath, item.qrUrl, item.qrPath);
            else openModal(item.id, item.title, item.description, item.dueDate, item.startDate);
        };
        listEl.appendChild(li);
    });
    document.getElementById('tripGroupModal').style.display = 'flex';
}
function closeTripGroupModal() { document.getElementById('tripGroupModal').style.display = 'none'; }

function renderGantt(tasksArray) {
    const header = document.getElementById('gantt-header'), body = document.getElementById('gantt-body');
    const todayTime = new Date().setHours(0,0,0,0);
    header.innerHTML = '<div class="gantt-row-label" style="border-right: 2px solid var(--border-color); border-bottom: none; background-color: var(--card-bg); z-index: 20;">업무명</div>';
    body.innerHTML = '';

    const year = currentDateForGantt.getFullYear(), month = currentDateForGantt.getMonth();
    document.getElementById('gantt-month-year').textContent = `${year}년 ${month + 1}월`;
    const startDay = new Date(year, month, 1), endDay = new Date(year, month + 1, 0);
    const timelineWidth = endDay.getDate() * 40;

    for (let i = 1; i <= endDay.getDate(); i++) {
        const d = new Date(year, month, i), dayEl = document.createElement('div');
        dayEl.className = 'gantt-day'; if (d.setHours(0,0,0,0) === todayTime) dayEl.classList.add('today');
        dayEl.textContent = i; header.appendChild(dayEl);
    }

    const undatedItems = tasksArray.filter(t => t.isTrip ? !t.startDate : (t.isLeave ? false : (!t.startDate && !t.dueDate)));
    const datedTrips = tasksArray.filter(t => t.isTrip && t.startDate);
    const datedLeaves = tasksArray.filter(t => t.isLeave && t.startDate);
    const datedTasks = tasksArray.filter(t => !t.isTrip && !t.isLeave && (t.startDate || t.dueDate));

    if (undatedItems.length > 0) {
        const row = document.createElement('div'); row.className = 'gantt-row';
        const label = document.createElement('div'); label.className = 'gantt-row-label'; label.style.color = 'var(--text-muted)'; label.innerHTML = '<span class="material-symbols-rounded" style="font-size:1.2em; margin-right:6px;">calendar_today</span> 날짜 미지정 (통합)'; row.appendChild(label);
        const barArea = document.createElement('div'); barArea.className = 'gantt-bar-area'; barArea.style.width = `${timelineWidth}px`;
        const bar = document.createElement('div'); bar.className = 'gantt-bar gantt-trip-group'; bar.dataset.assignee = undatedItems.map(t => t.assignee || '').join(' ').toLowerCase();
        bar.style.left = `${Math.round((todayTime - startDay.getTime()) / 86400000) * 40}px`; bar.style.width = `40px`; bar.style.backgroundColor = 'var(--text-muted)';
        bar.title = undatedItems.map(t => `${t.isTrip || t.isLeave ? t.name : t.title} (${t.assignee || '미지정'})`).join('\n');
        if (undatedItems.length > 1) { bar.textContent = `${undatedItems.length}건`; bar.onclick = () => openTripGroupModal(`🗓 날짜 미지정 목록`, undatedItems); } 
        else { bar.textContent = undatedItems[0].assignee || '미지정'; bar.onclick = () => undatedItems[0].isTrip ? openTripModal(undatedItems[0].id, undatedItems[0].name, undatedItems[0].date, undatedItems[0].assignee) : openModal(undatedItems[0].id, undatedItems[0].title, undatedItems[0].description, undatedItems[0].dueDate, undatedItems[0].startDate); }
        barArea.appendChild(bar); row.appendChild(barArea); body.appendChild(row);
    }

    datedTasks.forEach(task => {
        let startT = todayTime; if (task.startDate) { const p = new Date(task.startDate).setHours(0,0,0,0); if (!isNaN(p)) startT = p; }
        let dueT = startT; if (task.dueDate) { const p = new Date(task.dueDate).setHours(0,0,0,0); if (!isNaN(p)) dueT = p; }
        if (dueT < startT) dueT = startT;
        const startIndex = Math.round((startT - startDay.getTime()) / 86400000);
        const duration = Math.round((dueT - startT) / 86400000) + 1;

        const row = document.createElement('div'); row.className = 'gantt-row'; row.dataset.assignee = task.assignee || '미지정';
        const label = document.createElement('div'); label.className = 'gantt-row-label';
        let statusIcon = task.status === 'todo' ? 'radio_button_unchecked' : (task.status === 'doing' ? 'pending' : 'check_circle');
        label.innerHTML = `<span class="material-symbols-rounded" style="font-size:1.1em; margin-right:4px;">${statusIcon}</span>`; label.appendChild(document.createTextNode(task.title)); label.title = task.title;
        
        const barArea = document.createElement('div'); barArea.className = 'gantt-bar-area'; barArea.style.width = `${timelineWidth}px`;
        const bar = document.createElement('div'); bar.className = 'gantt-bar'; bar.style.left = `${startIndex * 40}px`; bar.style.width = `${duration * 40}px`;
        bar.style.backgroundColor = task.priority === 'high' ? 'var(--danger)' : (task.priority === 'low' ? '#10B981' : '#F59E0B');
        if (task.status === 'done') bar.classList.add('task-done-style');
        bar.textContent = task.assignee || '미지정'; bar.onclick = () => openModal(task.id, task.title, task.description, task.dueDate, task.startDate);
        barArea.appendChild(bar); row.appendChild(label); row.appendChild(barArea); body.appendChild(row);
    });
}

function renderTasks() {
    ['todo-list', 'doing-list', 'done-list', 'week-list', 'month-list', 'later-list'].forEach(id => { if (document.getElementById(id)) document.getElementById(id).innerHTML = ''; });
    if (!globalTasksData) return;

    const priorityWeight = { 'high': 3, 'medium': 2, 'low': 1 };
    const tasksArray = Object.values(globalTasksData).sort((a, b) => (priorityWeight[b.priority] || 2) - (priorityWeight[a.priority] || 2));
    
    const progressFill = document.getElementById('progress-fill'), progressText = document.getElementById('progress-text');
    if (progressFill && progressText) {
        const p = tasksArray.length === 0 ? 0 : Math.round((tasksArray.filter(t => t.status === 'done').length / tasksArray.length) * 100);
        progressFill.style.width = p + '%'; progressText.textContent = p + '%';
    }

    const tripsArray = Object.values(globalTripsData).map(t => ({ ...t, isTrip: true, title: `[출장] ${t.name}`, startDate: t.date, dueDate: t.date, status: 'todo' }));
    const leavesArray = Object.values(globalLeavesData).filter(l => l.status === 'approved').map(l => ({ id: l.id, isLeave: true, title: `[휴가] ${l.userName}`, assignee: l.userName, startDate: l.date, dueDate: l.date, status: 'todo', priority: 'medium' }));
    const combinedArray = [...tasksArray, ...tripsArray, ...leavesArray];

    if (currentViewMode === 'calendar') { renderCalendar(combinedArray); filterTasks(); return; }
    if (currentViewMode === 'gantt') { renderGantt(combinedArray); filterTasks(); return; }

    const today = new Date(); today.setHours(0,0,0,0);
    const endOfWeek = new Date(today); endOfWeek.setDate(today.getDate() + (6 - today.getDay()));
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    tasksArray.forEach(task => {
        const div = document.createElement('div'); div.className = 'task-card';
        if (currentViewMode === 'status') { div.draggable = true; div.ondragstart = (e) => drag(e, task.id); }
        div.onclick = (e) => { if(!e.target.classList.contains('delete-btn')) openModal(task.id, task.title, task.description, task.dueDate, task.startDate); };
        div.dataset.assignee = task.assignee || '미지정'; div.dataset.dueDate = task.dueDate || '';

        let priorityLabel = task.priority === 'high' ? '높음' : (task.priority === 'low' ? '낮음' : '보통');
        let priorityColor = task.priority === 'high' ? '#EF4444' : (task.priority === 'low' ? '#10B981' : '#F59E0B');
        const descIcon = task.description ? '<span style="font-size: 0.7rem; margin-left: 6px; padding: 2px 4px; background-color: var(--col-bg); border-radius: 4px; color: var(--text-muted);">상세</span>' : '';
        let dueBadge = '';
        if (task.dueDate) {
            const taskDate = new Date(task.dueDate); taskDate.setHours(0,0,0,0);
            const isOverdue = taskDate < today && task.status !== 'done';
            dueBadge = `<span style="font-size: 0.75rem; color: ${isOverdue ? 'var(--danger)' : 'var(--text-main)'}; margin-left: 6px; font-weight: 600;">${isOverdue ? '마감지연' : '마감일'} ${task.dueDate}</span>`;
        }

        div.innerHTML = `<div style="display: flex; flex-direction: column; gap: 0.5rem; width: 100%;">
            <div style="display: flex; justify-content: space-between; align-items: flex-start;"><span style="font-weight: 500; font-size: 0.95rem;">${task.title}${descIcon}${dueBadge}</span><button class="delete-btn" onclick="deleteTask('${task.id}')" title="삭제" style="padding:0.2rem;"><span class="material-symbols-rounded" style="font-size:1.1em;">close</span></button></div>
            <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.75rem;"><span style="color: var(--text-muted);">담당: ${task.assignee || '미지정'}</span><span style="background-color: ${priorityColor}15; color: ${priorityColor}; padding: 0.2rem 0.5rem; border-radius: 4px; font-weight: 600;">${priorityLabel}</span></div>
        </div>`;
        
        if (currentViewMode === 'status') { const el = document.getElementById(`${task.status}-list`); if(el) el.appendChild(div); } 
        else {
            let targetList = 'later-list';
            if (task.dueDate) {
                const d = new Date(task.dueDate); d.setHours(0,0,0,0);
                if (d <= endOfWeek) targetList = 'week-list'; else if (d <= endOfMonth) targetList = 'month-list';
            }
            const el = document.getElementById(targetList); if(el) el.appendChild(div); 
        }
    });
    filterTasks();
}

db.ref('tasks').on('value', (snapshot) => { globalTasksData = snapshot.val() || {}; renderTasks(); if(typeof renderMyPage === 'function') renderMyPage(); });

// ----------------------------------------------------
// 출장 & 휴가 & 마이페이지
// ----------------------------------------------------
let currentTripId = null;
function openTripModal(id = null, name = '', date = '', assignee = '', contact = '', address = '', scheduleUrl = '', schedulePath = '', qrUrl = '', qrPath = '') {
    currentTripId = id; document.getElementById('tripModalTitle').textContent = id ? '출장 수정' : '새 출장';
    document.getElementById('tripName').value = name; document.getElementById('tripDate').value = date;
    document.getElementById('tripAssignee').value = assignee; document.getElementById('tripContact').value = contact;
    document.getElementById('tripAddress').value = address;
    
    document.getElementById('tripScheduleFile').dataset.existingUrl = scheduleUrl;
    document.getElementById('tripScheduleFile').dataset.existingPath = schedulePath;
    document.getElementById('currentScheduleFile').textContent = scheduleUrl ? `첨부됨: ${schedulePath.split('_').pop()}` : '';
    document.getElementById('tripModal').style.display = 'flex';
}
function closeTripModal() { document.getElementById('tripModal').style.display = 'none'; currentTripId = null; }

async function saveTrip() {
    if (!currentUserProfile || !currentUserProfile.approved) return await customAlert('승인된 사용자만 저장할 수 있습니다.');
    const name = document.getElementById('tripName').value.trim();
    if (!name) return await customAlert('출장명을 입력해주세요.');

    const saveBtn = document.querySelector('#tripModal .modal-footer button');
    saveBtn.disabled = true; saveBtn.textContent = '저장 중...';

    try {
        const tripData = {
            name: name, date: document.getElementById('tripDate').value, assignee: document.getElementById('tripAssignee').value.trim(),
            contact: document.getElementById('tripContact').value.trim(), address: document.getElementById('tripAddress').value.trim(),
            scheduleUrl: document.getElementById('tripScheduleFile').dataset.existingUrl || '', schedulePath: document.getElementById('tripScheduleFile').dataset.existingPath || '',
            qrUrl: '', qrPath: ''
        };
        if (currentTripId) await db.ref('businessTrips/' + currentTripId).update(tripData);
        else { tripData.timestamp = Date.now(); const ref = db.ref('businessTrips').push(); tripData.id = ref.key; await ref.set(tripData); }
        closeTripModal();
    } catch (e) { await customAlert("저장 실패"); } finally { saveBtn.disabled = false; saveBtn.textContent = '저장'; }
}

async function deleteTrip(id) {
    if (!currentUserProfile || !currentUserProfile.approved) return;
    if (!await customConfirm('출장을 삭제하시겠습니까?')) return;
    db.ref('businessTrips/' + id).once('value').then(s => { const t = s.val(); if(t) { if(t.schedulePath) storage.ref(t.schedulePath).delete().catch(()=>{}); db.ref('businessTrips/' + id).remove(); }});
}

db.ref('businessTrips').on('value', (s) => {
    globalTripsData = s.val() || {}; renderTasks(); if(typeof renderMyPage === 'function') renderMyPage();
    const list = document.getElementById('trip-list'); if (!list) return; list.innerHTML = '';
    Object.values(globalTripsData).sort((a,b) => (a.date ? new Date(a.date).getTime() : Infinity) - (b.date ? new Date(b.date).getTime() : Infinity)).forEach(trip => {
        const div = document.createElement('div'); div.className = 'trip-card';
        if (trip.date && new Date(trip.date).setHours(0,0,0,0) < new Date().setHours(0,0,0,0)) div.classList.add('past-trip');
        div.innerHTML = `<div class="trip-header"><div style="display:flex; align-items:flex-start; gap:10px;"><input type="checkbox" class="trip-checkbox" value="${trip.id}" style="width:18px; height:18px; margin-top:2px; cursor:pointer;" title="동선 최적화 선택"><div style="flex:1;"><div class="trip-title">${trip.name}</div><div class="trip-date">${trip.date}</div></div></div><div style="display:flex;gap:0.3rem;"><button class="delete-btn edit" style="padding:0.3rem;background:var(--col-bg);color:var(--text-main)"><span class="material-symbols-rounded">edit</span></button><button class="delete-btn del" style="padding:0.3rem"><span class="material-symbols-rounded">close</span></button></div></div><div class="trip-info-row">${trip.address}</div>`;
        div.querySelector('.edit').onclick = () => openTripModal(trip.id, trip.name, trip.date, trip.assignee, trip.contact, trip.address, trip.scheduleUrl, trip.schedulePath);
        div.querySelector('.del').onclick = () => deleteTrip(trip.id);
        list.appendChild(div);
    });
});

function toggleLeaveRange() {
    const isRange = document.getElementById('leaveIsRange').checked;
    document.getElementById('leaveEndDate').style.display = isRange ? 'block' : 'none';
    document.getElementById('leaveRangeTilde').style.display = isRange ? 'block' : 'none';
    document.getElementById('leaveType').disabled = isRange;
}

async function applyLeave() {
    if (!currentUserProfile || !currentUserProfile.approved) return;
    const isRange = document.getElementById('leaveIsRange').checked;
    const start = document.getElementById('leaveStartDate').value, end = document.getElementById('leaveEndDate').value, typeVal = document.getElementById('leaveType').value;
    let dates = [], deduction = typeVal.startsWith('0.5') ? 0.5 : 1;
    if (!isRange) { if (!start) return; dates.push(start); }
    else {
        let curr = new Date(start), endD = new Date(end);
        while (curr <= endD) { if (curr.getDay() !== 0 && curr.getDay() !== 6) dates.push(`${curr.getFullYear()}-${String(curr.getMonth()+1).padStart(2,'0')}-${String(curr.getDate()).padStart(2,'0')}`); curr.setDate(curr.getDate() + 1); }
    }
    Promise.all(dates.map(d => { const ref = db.ref('leaves').push(); return ref.set({ id: ref.key, uid: auth.currentUser.uid, userName: currentUserProfile.displayName, date: d, type: deduction, subType: isRange ? '1' : typeVal, status: 'pending', timestamp: Date.now() }); })).then(() => customAlert('휴가가 신청되었습니다.'));
}

function renderLeaveUI() {
    if (!auth.currentUser || !currentUserProfile) return;
    let used = 0; const myLeaves = Object.values(globalLeavesData).filter(l => l.uid === auth.currentUser.uid);
    myLeaves.forEach(l => { if (l.status === 'approved' || l.status === 'pending' || l.status === 'cancel_requested') used += l.type; });
    document.getElementById('leave-remain').textContent = ((currentUserProfile.leaveTotal || 15) - used).toFixed(1);
    document.getElementById('leave-used').textContent = used.toFixed(1);
    const listEl = document.getElementById('leave-history-list'); listEl.innerHTML = '';
    myLeaves.sort((a,b) => b.timestamp - a.timestamp).forEach(l => {
        const li = document.createElement('li'); li.innerHTML = `<div><div style="font-weight:600;">${l.date}</div><div style="font-size:0.8rem; color:${l.status==='approved'?'#10B981':'#F59E0B'}">${l.status}</div></div><button class="delete-btn" onclick="cancelLeave('${l.id}')">취소</button>`;
        listEl.appendChild(li);
    });
}

async function cancelLeave(id) { if (await customConfirm('취소하시겠습니까?')) db.ref('leaves/' + id).update({ status: 'canceled' }); }
async function deleteLeaveRecord(id) { if (await customConfirm('삭제하시겠습니까?')) db.ref('leaves/' + id).remove(); }

function renderAdminLeaves() {
    const listEl = document.getElementById('admin-leave-list');
    if (listEl) {
        listEl.innerHTML = '';
        Object.keys(globalUsersData).forEach(uid => {
            const u = globalUsersData[uid];
            if (!u.approved) return;
            let used = 0;
            Object.values(globalLeavesData).forEach(l => {
                if (l.uid === uid && (l.status === 'approved' || l.status === 'pending' || l.status === 'cancel_requested')) used += l.type;
            });
            const total = u.leaveTotal || 15;
            const card = document.createElement('div');
            card.style.cssText = 'background-color: var(--card-bg); border: 1px solid var(--border-color); padding: 1rem; border-radius: 8px; box-shadow: var(--shadow-sm);';
            card.innerHTML = `<div style="font-weight: bold; margin-bottom: 0.5rem; display: flex; justify-content: space-between; align-items: center;"><span>${u.displayName}</span><button onclick="adminEditTotalLeave('${uid}', ${total})" style="padding: 0.2rem 0.5rem; font-size: 0.75rem; background-color: var(--col-bg); color: var(--text-main); border: 1px solid var(--border-color); border-radius: 4px; cursor: pointer;">수정</button></div><div style="font-size: 0.85rem; color: var(--text-muted); display: flex; justify-content: space-between;"><span>총 연차:</span> <span>${total}일</span></div><div style="font-size: 0.85rem; color: var(--text-muted); display: flex; justify-content: space-between;"><span>사용함:</span> <span style="color: var(--danger);">${used.toFixed(1)}일</span></div><div style="font-size: 0.85rem; color: var(--text-muted); display: flex; justify-content: space-between; margin-top: 0.3rem; padding-top: 0.3rem; border-top: 1px dashed var(--border-color); font-weight: bold;"><span>잔여:</span> <span style="color: var(--primary);">${(total - used).toFixed(1)}일</span></div>`;
            listEl.appendChild(card);
        });
    }
    
    // 휴가 결재 대기 목록 렌더링 로직 추가
    const pendingListEl = document.getElementById('admin-pending-leaves-list');
    if (pendingListEl) {
        pendingListEl.innerHTML = '';
        const pendingLeaves = Object.values(globalLeavesData).filter(l => l.status === 'pending');
        
        if (pendingLeaves.length === 0) {
            pendingListEl.innerHTML = '<li style="justify-content: center; color: var(--text-muted); font-size: 0.9rem;">대기 중인 결재 건이 없습니다.</li>';
        } else {
            pendingLeaves.sort((a, b) => b.timestamp - a.timestamp).forEach(l => {
                const li = document.createElement('li');
                const typeText = l.type === 1 ? '연차(1일)' : (l.subType === '0.5am' ? '오전 반차' : '오후 반차');
                
                li.innerHTML = `
                    <div style="display:flex; flex-direction:column; gap:4px;">
                        <div style="font-weight:600; display:flex; align-items:center; gap:6px;">
                            ${l.userName} <span style="font-size:0.8rem; padding:2px 6px; border-radius:4px; background-color:var(--col-bg); color:var(--text-muted);">${typeText}</span>
                        </div>
                        <div style="font-size:0.85rem; color:var(--primary); font-weight:bold;">${l.date}</div>
                    </div>
                    <div style="display:flex; gap:6px;">
                        <button onclick="adminResolveLeave('${l.id}', 'approved')" style="background-color: #10B981; padding: 0.4rem 0.8rem; font-size: 0.8rem;">승인</button>
                        <button onclick="adminResolveLeave('${l.id}', 'rejected')" style="background-color: var(--danger); padding: 0.4rem 0.8rem; font-size: 0.8rem;">반려</button>
                    </div>
                `;
                pendingListEl.appendChild(li);
            });
        }
    }
}

async function adminResolveLeave(id, newStatus) { db.ref('leaves/' + id).update({ status: newStatus }); }
async function adminEditTotalLeave(uid, currentTotal) {
    const newTotal = await customPrompt('연차 개수 설정:', currentTotal);
    if (newTotal) db.ref('users/' + uid).update({ leaveTotal: parseFloat(newTotal) });
}
function downloadLeaveCSV() { customAlert('CSV 다운로드 기능 실행'); }

let previousPendingLeaves = new Set(), isFirstLeavesLoad = true;
db.ref('leaves').on('value', (s) => {
    globalLeavesData = s.val() || {}; renderTasks(); renderLeaveUI(); renderMyPage();
    if (auth.currentUser && auth.currentUser.uid === ADMIN_UID) {
        renderAdminLeaves();
        Object.values(globalLeavesData).forEach(l => { if (l.status === 'pending' && !isFirstLeavesLoad && !previousPendingLeaves.has(l.id)) showToast(`🚨 휴가 신청: ${l.userName}`, 'warning'); previousPendingLeaves.add(l.id); });
    }
    isFirstLeavesLoad = false;
});

function renderMyPage() {
    const tasksList = document.getElementById('mypage-tasks'), tripsList = document.getElementById('mypage-trips'), leavesList = document.getElementById('mypage-leaves');
    if (!tasksList) return; tasksList.innerHTML = ''; tripsList.innerHTML = ''; leavesList.innerHTML = '';
    
    if (!auth.currentUser || !currentUserProfile) {
        const loginMsg = '<li style="justify-content: center; color: var(--text-muted); font-size: 0.9rem;">로그인 후 확인 가능합니다.</li>';
        tasksList.innerHTML = loginMsg; tripsList.innerHTML = loginMsg; leavesList.innerHTML = loginMsg;
        if(document.getElementById('mypage-profile-card')) document.getElementById('mypage-profile-card').style.display = 'none';
        return;
    }

    if(document.getElementById('mypage-profile-card')) {
        document.getElementById('mypage-profile-card').style.display = 'flex';
        document.getElementById('mypage-avatar').src = currentUserProfile.photoURL || "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1 1'%3E%3Crect width='1' height='1' fill='%23E5E7EB'/%3E%3C/svg%3E";
        document.getElementById('mypage-name').textContent = currentUserProfile.displayName;
        document.getElementById('mypage-email').textContent = currentUserProfile.email;
        const deptMap = { 'ceo': '대표', 'health_leader': '헬스케어 (팀장)', 'health_member': '헬스케어 (팀원)', 'marketing': '마케팅부', 'bidding': '입찰사무원', 'unassigned': '부서 미지정' };
        document.getElementById('mypage-dept').textContent = deptMap[currentUserProfile.department || 'unassigned'];
    }
    
    const myName = currentUserProfile.displayName.replace(/\s+/g, '').toLowerCase();
    const isMatched = (str) => str && str.split(/[,/]+/).map(s => s.replace(/\s+/g, '').toLowerCase()).some(n => n.includes(myName) || myName.includes(n));
    
    Object.values(globalTasksData).filter(t => isMatched(t.assignee)).forEach(t => {
        const li = document.createElement('li'); li.innerHTML = `<div style="font-weight:600;">${t.title}</div><div style="font-size:0.8rem;">마감: ${t.dueDate || '미정'}</div>`; li.onclick = () => openModal(t.id, t.title, t.description, t.dueDate, t.startDate); tasksList.appendChild(li);
    });
    Object.values(globalTripsData).filter(t => isMatched(t.assignee)).forEach(t => {
        const li = document.createElement('li'); li.innerHTML = `<div style="font-weight:600;">${t.name}</div><div style="font-size:0.8rem;">날짜: ${t.date || '미정'}</div>`; li.onclick = () => openTripModal(t.id, t.name, t.date, t.assignee); tripsList.appendChild(li);
    });
    Object.values(globalLeavesData).filter(l => l.uid === auth.currentUser.uid).sort((a,b) => b.timestamp - a.timestamp).forEach(l => {
        const li = document.createElement('li'); 
        let statusText = l.status === 'approved' ? '승인됨' : (l.status === 'pending' ? '대기중' : (l.status === 'canceled' ? '취소됨' : l.status));
        li.innerHTML = `<div style="font-weight:600;">${l.date}</div><div style="font-size:0.8rem; color:${l.status==='approved'?'#10B981':(l.status==='canceled'?'var(--text-muted)':'#F59E0B')}">${statusText} (${l.type}일)</div>`; 
        document.getElementById('mypage-leaves').appendChild(li);
    });
}

// ----------------------------------------------------
// 스마트 동선 최적화 (지도 및 TSP 알고리즘) 기능
// ----------------------------------------------------
let tripMap = null;
let mapPolylines = [];
let mapMarkers = [];

function getHaversineDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // 지구 반지름 (km)
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

// 카카오 내비 API를 활용한 실제 도로 경로 및 거리 탐색 함수
async function getRoadRoute(point1, point2) {
    const KAKAO_REST_API_KEY = "9159f23f57165f61ac722d066d6f43b5";
    const url = `https://apis-navi.kakaomobility.com/v1/directions?origin=${point1.lng},${point1.lat}&destination=${point2.lng},${point2.lat}`;
    try {
        const res = await fetch(url, { headers: { 'Authorization': `KakaoAK ${KAKAO_REST_API_KEY}` } });
        if (res.ok) {
            const data = await res.json();
            if (data.routes && data.routes.length > 0) {
                const route = data.routes[0];
                const distance = route.summary.distance / 1000; // 미터를 km로 변환
                const duration = route.summary.duration; // 초 단위 운전 소요 시간
                const path = [];
                route.sections.forEach(section => {
                    section.roads.forEach(road => {
                        for (let i = 0; i < road.vertexes.length; i += 2) {
                            path.push(new kakao.maps.LatLng(road.vertexes[i+1], road.vertexes[i]));
                        }
                    });
                });
                return { distance, duration, path };
            }
        }
    } catch (e) {
        console.warn("도로 경로 조회 실패. 직선거리로 대체합니다.", e);
    }
    // 내비 API 실패 시 기존 직선거리 로직으로 자동 폴백(안전장치)
    let fallbackDist = getHaversineDistance(point1.lat, point1.lng, point2.lat, point2.lng);
    return { distance: fallbackDist, duration: fallbackDist * 120, path: [new kakao.maps.LatLng(point1.lat, point1.lng), new kakao.maps.LatLng(point2.lat, point2.lng)] };
}

// 모든 팀과 출장지의 경우의 수를 계산하여 '총 이동 거리가 가장 짧은 환상의 짝꿍'을 찾아내는 함수
function getDailyBestAssignment(teams, trips) {
    let bestSum = Infinity;
    let bestAssignment = [];
    let N = teams.length;
    let M = trips.length;
    let maxAssign = Math.min(N, M);
    let usedTrips = new Array(M).fill(false);

    function backtrack(teamPtr, currentSum, currentAssign) {
        if (currentSum >= bestSum) return; // 더 긴 경로가 예상되면 즉시 포기 (계산 속도 극대화)
        if (currentAssign.length === maxAssign) {
            bestSum = currentSum;
            bestAssignment = [...currentAssign];
            return;
        }
        if (teamPtr >= N) return;

        let canSkip = (N - teamPtr > maxAssign - currentAssign.length);
        for (let i = 0; i < M; i++) {
            if (usedTrips[i]) continue;
            let team = teams[teamPtr];
            let trip = trips[i];
            let dist = team.lastPoint ? getHaversineDistance(team.lastPoint.lat, team.lastPoint.lng, trip.lat, trip.lng) : (1000 - trip.lat);
            
            usedTrips[i] = true;
            currentAssign.push({teamIdx: teamPtr, tripIdx: i});
            backtrack(teamPtr + 1, currentSum + dist, currentAssign);
            currentAssign.pop();
            usedTrips[i] = false;
        }
        if (canSkip) backtrack(teamPtr + 1, currentSum, currentAssign);
    }

    backtrack(0, 0, []);
    return bestAssignment;
}

async function calculateOptimizedRoute() {
    const teamCount = parseInt(document.getElementById('mapTeamCount').value) || 1;
    const routingStrategy = document.getElementById('mapRoutingStrategy').value;
    const isStartFromHQ = document.getElementById('mapStartFromHQ').checked;
    const checkedBoxes = document.querySelectorAll('.trip-checkbox:checked');
    let targetTrips = [];

    // 1. 대상 출장지 수집
    if (checkedBoxes.length > 0) {
        const selectedIds = Array.from(checkedBoxes).map(cb => cb.value);
        targetTrips = Object.values(globalTripsData).filter(t => selectedIds.includes(t.id) && t.address);
    } else {
        const assignee = document.getElementById('mapAssignee').value.trim().toLowerCase();
        const startDate = document.getElementById('mapStartDate').value;
        const endDate = document.getElementById('mapEndDate').value;

        if (!assignee || !startDate || !endDate) return await customAlert('출장 목록에서 동선을 그릴 출장지를 체크(✔)하거나,\n검색할 담당자 이름과 기간을 모두 입력해주세요.');
        if (startDate > endDate) return await customAlert('시작일이 종료일보다 늦을 수 없습니다.');

        targetTrips = Object.values(globalTripsData).filter(t => {
            if (!t.date || !t.assignee || !t.address) return false;
            const tName = t.assignee.toLowerCase();
            return (tName.includes(assignee) || assignee.includes(tName)) && t.date >= startDate && t.date <= endDate;
        });
    }

    if (typeof kakao === 'undefined' || !kakao.maps || !kakao.maps.services) {
        document.getElementById('tripMap').innerHTML = '<span style="color:var(--danger);">지도 API 로드 실패</span>';
        return await customAlert("카카오 지도 API가 연결되지 않았습니다.\n\nindex.html에 카카오 <script> 태그가 정확히 있는지 확인해주세요.");
    }

    document.getElementById('tripMap').innerHTML = '<div style="color:var(--text-main); font-weight:bold;">주소를 좌표로 변환하며 경로를 계산 중입니다...⏳</div>';
    document.getElementById('tripRouteList').innerHTML = '';

    if (targetTrips.length === 0) {
        document.getElementById('tripMap').innerHTML = '<span style="color:var(--text-muted);">선택된 출장지 중 주소가 입력된 내역이 없거나 조건에 맞지 않습니다.</span>';
        return;
    }

    // 2. 주소 -> 좌표 변환 (카카오 내장 Geocoder 사용)
    const tripsWithCoords = [];
    let failedTrips = [];
    const geocoder = new kakao.maps.services.Geocoder();

    for (let t of targetTrips) {
        await new Promise(resolve => {
            geocoder.addressSearch(t.address, function(result, status) {
                if (status === kakao.maps.services.Status.OK) {
                    tripsWithCoords.push({ ...t, lat: parseFloat(result[0].y), lng: parseFloat(result[0].x) });
                } else {
                    console.warn('주소 변환 실패:', t.address);
                    failedTrips.push(t.name);
                }
                resolve();
            });
        });
    }

    if (failedTrips.length > 0) {
        showToast(`⚠️ 아래 출장지는 주소를 찾을 수 없어 동선에서 제외되었습니다:\n👉 ${failedTrips.join(', ')}\n\n(상호명이 아닌 정확한 도로명/지번 주소로 수정해주세요!)`, "warning");
    }

    if (tripsWithCoords.length === 0) return await customAlert('입력된 주소들 중 지도에서 찾을 수 있는 정확한 주소가 없습니다.');

    // 본점(출발지) 좌표 세팅
    const hqAddress = "서울시 영등포구 도신로 143";
    let hqCoords = null;
    await new Promise(resolve => {
        geocoder.addressSearch(hqAddress, function(result, status) {
            if (status === kakao.maps.services.Status.OK) {
                hqCoords = { lat: parseFloat(result[0].y), lng: parseFloat(result[0].x), name: "본점 센터", address: hqAddress, isHQ: true };
            }
            resolve();
        });
    });
    if (!hqCoords) hqCoords = { lat: 37.506543, lng: 126.904543, name: "본점 센터", address: hqAddress, isHQ: true };

    const TEAM_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6'];
    
    let teams = Array.from({length: teamCount}, (_, i) => ({
        teamId: i + 1,
        color: TEAM_COLORS[i % TEAM_COLORS.length],
        route: [],
        path: [],
        totalDistance: 0,
        totalDuration: 0,
        lastPoint: isStartFromHQ ? hqCoords : null // 본점 여정 시작일 경우 첫 포인트 고정
    }));

    let skippedTrips = [];

    let tripsByDate = {};
    tripsWithCoords.forEach(t => {
        if (!tripsByDate[t.date]) tripsByDate[t.date] = [];
        tripsByDate[t.date].push(t);
    });
    const sortedDates = Object.keys(tripsByDate).sort((a,b) => new Date(a) - new Date(b));

    // --- 알고리즘 분기점 ---
    if (routingStrategy === 'total_distance') {
        for (let date of sortedDates) {
            let todaysTrips = [...tripsByDate[date]];
            let bestAssignment = getDailyBestAssignment(teams, todaysTrips);
            
            let assignedTripIndices = new Set();
            bestAssignment.forEach(assign => {
                let team = teams[assign.teamIdx];
                let trip = todaysTrips[assign.tripIdx];
                team.route.push(trip);
                team.lastPoint = trip;
                assignedTripIndices.add(assign.tripIdx);
            });
            
            for (let i = 0; i < todaysTrips.length; i++) {
                if (!assignedTripIndices.has(i)) skippedTrips.push(todaysTrips[i]);
            }
        }
    } else if (routingStrategy === 'sequential') {
        // [옵션 2] 전날 출장지 기준 (가까운 곳 우선 - 무조건 직전 위치에서 가장 가까운 곳 줍기)
        for (let date of sortedDates) {
            let todaysTrips = [...tripsByDate[date]];
            let availableTeams = teams.map((t, idx) => idx);

            while (todaysTrips.length > 0 && availableTeams.length > 0) {
                let bestTeamIdx = -1;
                let bestTripIdx = -1;
                let minDistance = Infinity;

                for (let i = 0; i < availableTeams.length; i++) {
                    let teamIdx = availableTeams[i];
                    let team = teams[teamIdx];
                    for (let j = 0; j < todaysTrips.length; j++) {
                        let trip = todaysTrips[j];
                        let dist = team.lastPoint ? getHaversineDistance(team.lastPoint.lat, team.lastPoint.lng, trip.lat, trip.lng) : (1000 - trip.lat);
                        if (dist < minDistance) { minDistance = dist; bestTeamIdx = teamIdx; bestTripIdx = j; }
                    }
                }

                let selectedTeam = teams[bestTeamIdx];
                let selectedTrip = todaysTrips.splice(bestTripIdx, 1)[0];
                selectedTeam.route.push(selectedTrip);
                selectedTeam.lastPoint = selectedTrip;
                availableTeams = availableTeams.filter(idx => idx !== bestTeamIdx);
            }
            if (todaysTrips.length > 0) skippedTrips.push(...todaysTrips);
        }
    } else if (routingStrategy === 'time') {
        // [옵션 3] 실시간 교통 상황 기준 (카카오내비 실제 주행 시간 비교)
        document.getElementById('tripMap').innerHTML = '<div style="color:var(--text-main); font-weight:bold;">실시간 교통정보(카카오내비)를 분석 중입니다...⏳<br><small style="font-weight:normal;color:var(--text-muted);">요청이 많아 약간의 시간이 소요될 수 있습니다.</small></div>';
        
        for (let date of sortedDates) {
            let todaysTrips = [...tripsByDate[date]];
            let availableTeams = teams.map((t, idx) => idx);

            while (todaysTrips.length > 0 && availableTeams.length > 0) {
                let combinations = [];
                for (let i = 0; i < availableTeams.length; i++) {
                    let teamIdx = availableTeams[i];
                    for (let j = 0; j < todaysTrips.length; j++) {
                        combinations.push({ teamIdx, tripIdx: j, team: teams[teamIdx], trip: todaysTrips[j] });
                    }
                }

                // 남아있는 모든 경우의 수를 동시에 카카오 내비에 물어보고 가장 덜 막히는 길을 찾아냄
                await Promise.all(combinations.map(async (combo) => {
                    if (combo.team.lastPoint) {
                        let roadData = await getRoadRoute(combo.team.lastPoint, combo.trip);
                        combo.duration = roadData.duration;
                    } else {
                        combo.duration = (1000 - combo.trip.lat) * 3600; // 초기 위치가 없을 때 위도 기준 방어
                    }
                }));

                let bestCombo = combinations.reduce((min, curr) => curr.duration < min.duration ? curr : min, {duration: Infinity});

                let selectedTeam = teams[bestCombo.teamIdx];
                let selectedTrip = todaysTrips.splice(bestCombo.tripIdx, 1)[0];
                selectedTeam.route.push(selectedTrip);
                selectedTeam.lastPoint = selectedTrip;
                availableTeams = availableTeams.filter(idx => idx !== bestCombo.teamIdx);
            }
            if (todaysTrips.length > 0) skippedTrips.push(...todaysTrips);
        }
    }

    if (skippedTrips.length > 0) {
        showToast(`⚠️ [팀 수 부족] 1팀 1일 1출장 원칙에 따라, 배정받지 못한 출장지가 ${skippedTrips.length}곳 있습니다.\n모든 동선을 소화하려면 팀(차량) 수를 늘려주세요.`, "warning");
    }

    // 4. 팀별로 확정된 스케줄을 따라 카카오 내비 실제 도로 호출 (순차적)
    for (let team of teams) {
        if (team.route.length === 0) continue;
        
        let current = isStartFromHQ ? hqCoords : null;
        for (let trip of team.route) {
            if (current) {
                let roadData = await getRoadRoute(current, trip); 
                trip.distFromPrev = roadData.distance;
                trip.durationFromPrev = roadData.duration;
                team.totalDistance += roadData.distance;
                team.totalDuration += roadData.duration;
                if (roadData.path && roadData.path.length > 0) {
                    team.path.push(...roadData.path);
                } else {
                    team.path.push(new kakao.maps.LatLng(current.lat, current.lng));
                    team.path.push(new kakao.maps.LatLng(trip.lat, trip.lng));
                }
            } else {
                trip.distFromPrev = 0;
                trip.durationFromPrev = 0;
            }
            current = trip;
        }
    }
    
    const finalRoutes = teams.filter(t => t.route.length > 0);

    // 5. 지도 렌더링
    const mapContainer = document.getElementById('tripMap');
    mapContainer.innerHTML = '';
    const initialCenter = finalRoutes.length > 0 && finalRoutes[0].route.length > 0 ? new kakao.maps.LatLng(finalRoutes[0].route[0].lat, finalRoutes[0].route[0].lng) : new kakao.maps.LatLng(37.506543, 126.904543);
    const mapOptions = { center: initialCenter, level: 8 };
    tripMap = new kakao.maps.Map(mapContainer, mapOptions);
    
    const bounds = new kakao.maps.LatLngBounds();
    const listEl = document.getElementById('tripRouteList');

    if (isStartFromHQ && hqCoords) {
        const hqPosition = new kakao.maps.LatLng(hqCoords.lat, hqCoords.lng);
        bounds.extend(hqPosition);
        const hqContentEl = document.createElement('div');
        hqContentEl.innerHTML = `<div style="background-color: #1F2937; color: white; padding: 4px 8px; border-radius: 8px; display: flex; justify-content: center; align-items: center; font-weight: bold; font-size: 0.85rem; border: 2px solid white; box-shadow: var(--shadow-sm); cursor: pointer;"><span class="material-symbols-rounded" style="font-size:1.1em; margin-right:4px;">apartment</span>본점</div>`;
        const hqOverlay = new kakao.maps.CustomOverlay({ position: hqPosition, content: hqContentEl, yAnchor: 0.5, zIndex: 10 });
        hqOverlay.setMap(tripMap);
    }

    finalRoutes.sort((a,b) => a.teamId - b.teamId).forEach(teamData => {
        const color = teamData.color;
        
        let hrs = Math.floor(teamData.totalDuration / 3600);
        let mins = Math.floor((teamData.totalDuration % 3600) / 60);
        let durationText = hrs > 0 ? `${hrs}시간 ${mins}분` : `${mins}분`;

        // 팀 헤더 및 총 주행 거리 표시
        const headerLi = document.createElement('div');
        headerLi.className = 'route-team-header';
        headerLi.style.borderColor = color;
        headerLi.style.color = color;
        headerLi.innerHTML = `<span class="material-symbols-rounded">local_shipping</span> ${teamData.teamId}팀 배정 동선 <span style="margin-left:auto; font-size:0.85rem; color:var(--text-muted); font-weight:normal;">총 이동: <b style="color:${color}; font-size:1.1rem;">${teamData.totalDistance.toFixed(1)}km</b> (${durationText})</span>`;
        listEl.appendChild(headerLi);

        let currentRenderDate = null;
        let tripNumber = 1; // 순번 카운터

        teamData.route.forEach((trip) => {
            const position = new kakao.maps.LatLng(trip.lat, trip.lng);
            bounds.extend(position);

            if (currentRenderDate !== trip.date) {
                const dateHeader = document.createElement('div');
                dateHeader.style.cssText = 'font-size:0.85rem; color:var(--text-muted); margin: 0.8rem 0 0.2rem 0.5rem; font-weight:bold;';
                dateHeader.textContent = `🗓 [${trip.date}]`;
                listEl.appendChild(dateHeader);
                
                if (isStartFromHQ && tripNumber === 1) { // 첫날의 맨 처음에만 본점 표시
                    const startLi = document.createElement('div');
                    startLi.className = 'route-item';
                    startLi.innerHTML = `<div class="route-item-number" style="background-color: #1F2937; width:auto; padding:0 8px; border-radius:12px; font-size: 0.8rem;">출발</div>
                        <div class="route-item-info">
                            <div class="route-item-title">${hqCoords.name}</div><div class="route-item-address">${hqCoords.address}</div>
                        </div>`;
                    listEl.appendChild(startLi);
                }
                currentRenderDate = trip.date;
            }

            // 마커 렌더링 (순번 표시)
            const contentEl = document.createElement('div');
            contentEl.innerHTML = `<div style="background-color: ${color}; color: white; width: 28px; height: 28px; border-radius: 50%; display: flex; justify-content: center; align-items: center; font-weight: bold; font-size: 1.1rem; border: 2px solid white; box-shadow: var(--shadow-sm); cursor: pointer;">${tripNumber}</div>`;
            const customOverlay = new kakao.maps.CustomOverlay({ position: position, content: contentEl, yAnchor: 0.5, zIndex: 2 });
            customOverlay.setMap(tripMap);
            
            const infoOverlay = new kakao.maps.CustomOverlay({ position: position, content: `<div style="padding:8px; font-size:0.85rem; color:#333; background:white; border-radius:4px; box-shadow:var(--shadow-md); border:2px solid ${color}; transform: translateY(-40px); white-space: nowrap;">${trip.name}</div>`, yAnchor: 1, zIndex: 3 });
            contentEl.addEventListener('mouseenter', () => infoOverlay.setMap(tripMap));
            contentEl.addEventListener('mouseleave', () => infoOverlay.setMap(null));

            let tripHrs = Math.floor(trip.durationFromPrev / 3600);
            let tripMins = Math.floor((trip.durationFromPrev % 3600) / 60);
            let tripDurationText = tripHrs > 0 ? `${tripHrs}시간 ${tripMins}분` : `${tripMins}분`;

            // 목록 아이템 렌더링
            const li = document.createElement('div');
            li.className = 'route-item';
            li.innerHTML = `<div class="route-item-number" style="background-color: ${color};">${tripNumber}</div>
                <div class="route-item-info">
                    <div class="route-item-title">${trip.name}</div><div class="route-item-address">${trip.address}</div>
                    ${trip.distFromPrev > 0 ? `<div class="route-item-dist" style="color:${color};">↑ 차량 이동 약 ${trip.distFromPrev.toFixed(1)}km (${tripDurationText})</div>` : ''}
                </div>`;
            listEl.appendChild(li);
            
            tripNumber++; // 순번 증가
        });
        
        // 팀 전체 경로 선 한 번에 그리기 (서버 부하 없이 매끄럽게 연결)
        if (teamData.path && teamData.path.length > 0) {
            teamData.path.forEach(p => bounds.extend(p));
            const polyline = new kakao.maps.Polyline({ 
                path: teamData.path, 
                strokeWeight: 6, 
                strokeColor: color, 
                strokeOpacity: 0.8, 
                strokeStyle: 'solid' 
            });
            polyline.setMap(tripMap);
        }
    });
    
    if (finalRoutes.some(r => r.route.length > 0)) {
        tripMap.setBounds(bounds);
    }
}

// ----------------------------------------------------
// 2. 실시간 문서 기능
// ----------------------------------------------------
let isTyping = false;
const quill = new Quill('#editor-container', {
    theme: 'snow',
    modules: { toolbar: [ [{ 'header': [1, 2, 3, false] }], ['bold', 'italic', 'underline', 'strike'], [{ 'list': 'ordered'}, { 'list': 'bullet' }], ['link', 'image'], ['clean'] ] },
    placeholder: '회의록이나 아이디어를 자유롭게 작성하세요...'
});

quill.on('text-change', function(delta, oldDelta, source) {
    if (source === 'user') {
        if (!currentUserProfile || !currentUserProfile.approved) return;
        isTyping = true;
        db.ref('sharedNote').set(quill.root.innerHTML);
        db.ref('typingStatus').set({ name: currentUserProfile.displayName, time: Date.now() });
        clearTimeout(window.typingTimer);
        window.typingTimer = setTimeout(() => { isTyping = false; db.ref('typingStatus').remove(); }, 1000);
    }
});

db.ref('sharedNote').on('value', (snapshot) => {
    if (!isTyping) { const content = snapshot.val() || ''; if (quill.root.innerHTML !== content) quill.root.innerHTML = content; }
});
db.ref('typingStatus').on('value', (snapshot) => {
    const indicator = document.getElementById('typing-indicator'), data = snapshot.val();
    if (data && data.name && (Date.now() - data.time < 3000)) {
        if (currentUserProfile && data.name === currentUserProfile.displayName) return indicator.classList.remove('active');
        indicator.textContent = `⋯ ${data.name}님이 작성 중입니다...`; indicator.classList.add('active');
    } else indicator.classList.remove('active');
});

// ----------------------------------------------------
// 3. 파일 업로드 기능
// ----------------------------------------------------
async function uploadFile() {
    if (!currentUserProfile || !currentUserProfile.approved) return await customAlert('승인된 사용자만 업로드 가능합니다.');
    const fileInput = document.getElementById('fileInput'), file = fileInput.files[0];
    if (!file) return await customAlert('파일을 선택해주세요.');
    if (file.size > 10 * 1024 * 1024) return await customAlert('파일 용량은 10MB를 초과할 수 없습니다.');

    document.getElementById('uploadStatus').innerText = '업로드 중...';
    const filePath = 'uploads/' + Date.now() + '_' + file.name;
    storage.ref(filePath).put(file).then(snapshot => snapshot.ref.getDownloadURL().then(url => {
        db.ref('files').push().set({ id: Date.now().toString(), name: file.name, url: url, path: filePath, timestamp: Date.now() });
        document.getElementById('uploadStatus').innerText = '업로드 완료!'; fileInput.value = ''; updateFileName('fileInput', 'fileNameDisplay');
    })).catch(e => document.getElementById('uploadStatus').innerText = '업로드 실패');
}
async function deleteFile(fileId, filePath) {
    if (!await customConfirm('삭제하시겠습니까?')) return;
    storage.ref(filePath).delete().then(() => db.ref('files/' + fileId).remove());
}
db.ref('files').on('value', (s) => {
    const list = document.getElementById('fileList'); list.innerHTML = '';
    const data = s.val(); if (!data) return;
    Object.values(data).sort((a,b) => b.timestamp - a.timestamp).forEach(f => {
        const li = document.createElement('li'); li.innerHTML = `<a href="${f.url}" target="_blank">${f.name}</a> ${f.path ? `<button class="delete-btn" onclick="deleteFile('${f.id}', '${f.path}')">삭제</button>` : ''}`;
        list.appendChild(li);
    });
});

// ----------------------------------------------------
// 조직도(팀원 목록) 및 채팅 기능
// ----------------------------------------------------
db.ref('users').on('value', (snapshot) => { globalUsersData = snapshot.val() || {}; renderMembersDirectory(); renderChatList(); setupPrivateChatNotificationListeners(); });

function renderMembersDirectory() {
    ['ceo', 'health_leader', 'health_member', 'marketing', 'bidding', 'unassigned'].forEach(id => { const el = document.getElementById('list-' + id); if (el) el.innerHTML = ''; });
    if (!auth.currentUser) return;
    const isAdmin = auth.currentUser.uid === ADMIN_UID;
    if (document.getElementById('org-admin-guide')) document.getElementById('org-admin-guide').style.display = isAdmin ? 'block' : 'none';

    Object.keys(globalUsersData).forEach(uid => {
        const u = globalUsersData[uid]; if (!u.approved) return;
        const card = document.createElement('div'); card.className = 'org-card' + (isAdmin ? ' draggable' : '');
        if (isAdmin) { card.draggable = true; card.ondragstart = (e) => e.dataTransfer.setData("uid", uid); }
        card.innerHTML = `<img src="${u.photoURL || "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1 1'%3E%3Crect width='1' height='1' fill='%23E5E7EB'/%3E%3C/svg%3E"}" style="width: 54px; height: 54px; border-radius: 50%; object-fit: cover;"><div style="flex:1;font-weight:800;font-size:1.1rem;">${u.displayName}</div>${uid !== auth.currentUser.uid ? `<button onclick="openPrivateChat('${uid}', '${u.displayName}')" class="delete-btn" style="background:var(--col-bg);color:var(--text-muted);"><span class="material-symbols-rounded">chat</span></button>` : ''}`;
        const target = document.getElementById('list-' + (u.department || 'unassigned')); if (target) target.appendChild(card);
    });
}
async function dropMember(ev, newDept) {
    ev.preventDefault(); const uid = ev.dataTransfer.getData("uid");
    if (uid) {
        if (auth.currentUser.uid !== ADMIN_UID) return await customAlert('최고 관리자만 수정 가능합니다.');
        db.ref('users/' + uid).update({ department: newDept });
    }
}
function allowDrop(ev) { ev.preventDefault(); }

let currentPrivateChatTargetUid = null, currentPrivateChatRef = null;
function getPrivateChatId(uid1, uid2) { return uid1 < uid2 ? `${uid1}_${uid2}` : `${uid2}_${uid1}`; }

function openPrivateChat(targetUid, targetName) {
    currentPrivateChatTargetUid = targetUid;
    document.getElementById('chat-list-window').style.display = 'none'; document.getElementById('chat-window').style.display = 'none';
    document.getElementById('private-chat-title').textContent = `${targetName}님과 채팅`; document.getElementById('private-chat-window').style.display = 'flex';
    if (currentPrivateChatRef) currentPrivateChatRef.off();
    
    currentPrivateChatRef = db.ref(`privateChats/${getPrivateChatId(auth.currentUser.uid, targetUid)}`).orderByChild('timestamp').limitToLast(50);
    currentPrivateChatRef.on('value', (s) => {
        const chatBody = document.getElementById('private-chat-messages'); chatBody.innerHTML = '';
        s.forEach(child => {
            const msg = child.val(), isMine = msg.uid === auth.currentUser.uid;
            const msgEl = document.createElement('div'); msgEl.className = `chat-message ${isMine ? 'mine' : 'others'}`;
            msgEl.innerHTML = `${!isMine ? `<div class="chat-sender">${msg.sender}</div>` : ''}<div class="chat-bubble">${msg.text}</div>`;
            chatBody.appendChild(msgEl);
        });
        setTimeout(() => chatBody.scrollTop = chatBody.scrollHeight, 10);
    });
}
function closePrivateChat() { document.getElementById('private-chat-window').style.display = 'none'; if (currentPrivateChatRef) currentPrivateChatRef.off(); currentPrivateChatTargetUid = null; }
function handlePrivateChatEnter(event) { if (event.key === 'Enter') { event.preventDefault(); sendPrivateMessage(); } }
async function sendPrivateMessage() {
    const text = document.getElementById('private-chat-input').value.trim(); if (!text || !currentPrivateChatTargetUid) return;
    db.ref(`privateChats/${getPrivateChatId(auth.currentUser.uid, currentPrivateChatTargetUid)}`).push({ uid: auth.currentUser.uid, sender: currentUserProfile.displayName, text: text, timestamp: Date.now() });
    document.getElementById('private-chat-input').value = '';
}

function toggleChatListWindow() {
    const listWindow = document.getElementById('chat-list-window'), groupWindow = document.getElementById('chat-window'), privateWindow = document.getElementById('private-chat-window');
    if (groupWindow.style.display === 'flex' || privateWindow.style.display === 'flex') { groupWindow.style.display = 'none'; privateWindow.style.display = 'none'; listWindow.style.display = 'flex'; return; }
    if (listWindow.style.display === 'none' || listWindow.style.display === '') { listWindow.style.display = 'flex'; renderChatList(); } else listWindow.style.display = 'none';
}
function backToChatList() { document.getElementById('chat-window').style.display = 'none'; closePrivateChat(); document.getElementById('chat-list-window').style.display = 'flex'; }
function openGroupChat() { document.getElementById('chat-list-window').style.display = 'none'; document.getElementById('chat-window').style.display = 'flex'; setTimeout(() => document.getElementById('chat-input').focus(), 100); }

function renderChatList() {
    const listBody = document.getElementById('chat-list-body'); if (!listBody) return; listBody.innerHTML = '';
    if (!auth.currentUser || !currentUserProfile || !currentUserProfile.approved) return;
    
    const groupItem = document.createElement('div'); groupItem.className = 'chat-list-item'; groupItem.onclick = openGroupChat;
    groupItem.innerHTML = `<div style="width:48px;height:48px;border-radius:18px;background:var(--primary);color:white;display:flex;justify-content:center;align-items:center;margin-right:12px;"><span class="material-symbols-rounded">groups</span></div><div style="flex:1;font-weight:700;">사내 단체 채팅방</div>`; listBody.appendChild(groupItem);
    
    Object.keys(globalUsersData).forEach(uid => {
        if (uid === auth.currentUser.uid) return;
        const u = globalUsersData[uid]; if (!u.approved) return;
        const item = document.createElement('div'); item.className = 'chat-list-item'; item.onclick = () => openPrivateChat(uid, u.displayName);
        item.innerHTML = `<img src="${u.photoURL || "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1 1'%3E%3Crect width='1' height='1' fill='%23E5E7EB'/%3E%3C/svg%3E"}" style="width:48px;height:48px;border-radius:18px;margin-right:12px; object-fit: cover;"><div style="flex:1;font-weight:600;">${u.displayName}</div>`; listBody.appendChild(item);
    });
}
function handleChatEnter(event) { if (event.key === 'Enter') { event.preventDefault(); sendChatMessage(); } }
async function sendChatMessage() {
    const text = document.getElementById('chat-input').value.trim(); if (!text) return;
    db.ref('chatMessages').push({ uid: auth.currentUser.uid, sender: currentUserProfile.displayName, text: text, timestamp: Date.now() });
    document.getElementById('chat-input').value = '';
}
db.ref('chatMessages').orderByChild('timestamp').limitToLast(50).on('value', (s) => {
    const chatBody = document.getElementById('chat-messages'); if (!chatBody) return; chatBody.innerHTML = '';
    s.forEach(child => {
        const msg = child.val(), isMine = auth.currentUser && auth.currentUser.uid === msg.uid;
        const msgEl = document.createElement('div'); msgEl.className = `chat-message ${isMine ? 'mine' : 'others'}`;
        msgEl.innerHTML = `${!isMine ? `<div class="chat-sender">${msg.sender}</div>` : ''}<div class="chat-bubble">${msg.text}</div>`; chatBody.appendChild(msgEl);
    });
    setTimeout(() => chatBody.scrollTop = chatBody.scrollHeight, 10);
});

let privateChatListeners = {}, initTimeForPrivateChats = Date.now();
function setupPrivateChatNotificationListeners() {
    const currentUid = auth.currentUser ? auth.currentUser.uid : null; if (!currentUid) return;
    Object.keys(globalUsersData).forEach(targetUid => {
        if (targetUid === currentUid) return;
        const chatId = getPrivateChatId(currentUid, targetUid);
        if (!privateChatListeners[chatId]) {
            db.ref(`privateChats/${chatId}`).limitToLast(1).on('child_added', (s) => {
                const msg = s.val();
                if (msg && msg.uid !== currentUid && msg.timestamp > initTimeForPrivateChats) {
                    showToast(`💬 ${globalUsersData[targetUid].displayName}님:\n${msg.text}`, 'info');
                    if (currentPrivateChatTargetUid !== targetUid) openPrivateChat(targetUid, globalUsersData[targetUid].displayName);
                }
            });
            privateChatListeners[chatId] = true;
        }
    });
}

// ----------------------------------------------------
// 전사 공지사항
// ----------------------------------------------------
let currentNoticeId = null;
function renderNotices() {
    const listEl = document.getElementById('notice-list'); if (!listEl) return; listEl.innerHTML = '';
    Object.values(globalNoticesData).sort((a,b) => b.timestamp - a.timestamp).forEach(notice => {
        const li = document.createElement('li'); li.className = 'notice-item'; li.innerHTML = `<div class="notice-item-title">${notice.title}</div><div class="notice-item-author">${notice.author}</div>`;
        li.onclick = () => viewNotice(notice.id); listEl.appendChild(li);
    });
}
function viewNotice(id) { const notice = globalNoticesData[id]; currentNoticeId = id; document.getElementById('noticeTitleInput').value = notice.title; document.getElementById('noticeContentInput').value = notice.content; document.getElementById('noticeModal').style.display = 'flex'; db.ref('notices/' + id + '/views').set((notice.views || 0) + 1); }
function openNoticeModal() { currentNoticeId = null; document.getElementById('noticeTitleInput').value = ''; document.getElementById('noticeContentInput').value = ''; document.getElementById('noticeModal').style.display = 'flex'; }
function closeNoticeModal() { document.getElementById('noticeModal').style.display = 'none'; currentNoticeId = null; }
async function saveNotice() {
    const title = document.getElementById('noticeTitleInput').value.trim(), content = document.getElementById('noticeContentInput').value.trim(); if (!title || !content) return;
    const data = { title: title, content: content, author: currentUserProfile.displayName, uid: auth.currentUser.uid, timestamp: currentNoticeId ? globalNoticesData[currentNoticeId].timestamp : Date.now(), views: currentNoticeId ? globalNoticesData[currentNoticeId].views : 0 };
    if (currentNoticeId) db.ref('notices/' + currentNoticeId).update(data); else { const ref = db.ref('notices').push(); data.id = ref.key; ref.set(data); }
    closeNoticeModal();
}
async function deleteNotice() { if (await customConfirm('삭제하시겠습니까?')) { db.ref('notices/' + currentNoticeId).remove(); closeNoticeModal(); } }
db.ref('notices').on('value', (s) => { globalNoticesData = s.val() || {}; renderNotices(); });
