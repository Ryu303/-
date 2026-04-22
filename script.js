// ----------------------------------------------------
// 중요: 이 부분에 본인의 Firebase 설정값을 붙여넣으세요!
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

// 파이어베이스 앱 초기화 (이 부분이 가장 먼저 실행되어야 합니다)
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

// 파이어베이스의 각 서비스(인증, DB, 스토리지)를 변수에 할당합니다.
const auth = firebase.auth();
const provider = new firebase.auth.GoogleAuthProvider();
const db = firebase.database();
const storage = firebase.storage();

// ----------------------------------------------------
// 다크 모드 (Dark Mode) 제어
// ----------------------------------------------------
function initTheme() {
    // 이전에 저장해둔 테마가 있는지 확인하고, 없으면 라이트 모드로 시작
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
    localStorage.setItem('theme', newTheme); // 브라우저에 설정 저장
    document.getElementById('theme-toggle').innerHTML = newTheme === 'dark' ? '<span class="material-symbols-rounded">light_mode</span>' : '<span class="material-symbols-rounded">dark_mode</span>';
    const flatpickrTheme = document.getElementById('flatpickr-theme');
    if (flatpickrTheme) {
        flatpickrTheme.href = newTheme === 'dark' ? "https://cdn.jsdelivr.net/npm/flatpickr/dist/themes/dark.css" : "https://cdn.jsdelivr.net/npm/flatpickr/dist/flatpickr.min.css";
    }
}

initTheme(); // 페이지 로드 시 즉시 테마 초기화 실행

// Flatpickr (커스텀 달력) 초기화 설정
const fpConfig = {
    locale: "ko",
    dateFormat: "Y-m-d",
    disableMobile: true, // 모바일 기기에서도 OS 기본 달력 대신 예쁜 커스텀 달력 강제 적용
    monthSelectorType: "static"
};
flatpickr("#modalStartDate", fpConfig);
flatpickr("#modalDueDate", fpConfig);
flatpickr("#tripDate", fpConfig);
flatpickr("#leaveStartDate", fpConfig);
flatpickr("#leaveEndDate", fpConfig);

let globalLeavesData = {}; // 전체 휴가 데이터 전역 저장용

// ----------------------------------------------------
// 세련된 커스텀 알림창 모달 제어
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

// ----------------------------------------------------
// 인앱 토스트 알림 (웹 푸시)
// ----------------------------------------------------
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
    }, 5000); // 5초 후 오른쪽으로 스르륵 사라짐
}

// ----------------------------------------------------
// 탭(Tab) 메뉴 제어
// ----------------------------------------------------
function switchTab(tabId, element) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.style.display = 'none');
    
    if (element) element.classList.add('active');
    document.getElementById(tabId).style.display = 'block';
}

// ----------------------------------------------------
// 0. 로그인 기능 (Firebase Authentication)
// ----------------------------------------------------

// ⭐️ 관리자(Admin)의 Google UID를 여기에 입력하세요.
// 💡 본인 UID 확인 방법: 로그인 후 개발자 콘솔(F12)에 auth.currentUser.uid 를 입력하고 엔터!
const ADMIN_UID = "jaGugunGReXytCgbqYwQUybxyJL2"; 
let currentUserProfile = null; // 현재 로그인한 사용자의 DB 프로필 정보

function loginWithGoogle() {
    auth.signInWithPopup(provider).then((result) => {
        console.log("로그인 성공:", result.user.displayName);
    }).catch(async (error) => {
        console.error("로그인 에러:", error);
        // 인앱 브라우저 차단 오류 메시지를 더 친절하게 안내
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

// 로그인 상태 감지 (실시간)
auth.onAuthStateChanged((user) => {
    const adminPanel = document.getElementById('admin-panel');

    if (user) { // 사용자가 로그인한 경우
        const userRef = db.ref('users/' + user.uid);

        // 사용자의 프로필 정보를 실시간으로 감지합니다.
        // (관리자가 승인하면 화면이 자동으로 갱신되도록 .on() 사용)
        userRef.on('value', (snapshot) => {
            if (!snapshot.exists()) {
                // 이 사용자가 처음 로그인한 경우, 기본 프로필을 생성합니다.
                const newProfile = {
                    displayName: user.displayName,
                    email: user.email,
                    photoURL: user.photoURL || '',
                    approved: user.uid === ADMIN_UID, // 관리자는 처음부터 자동 승인!
                    leaveTotal: 15 // 신규 가입 시 초기 연차 개수 기본값
                };
                userRef.set(newProfile);
                currentUserProfile = newProfile;
            } else {
                // 기존 사용자인 경우, 프로필 정보를 가져옵니다.
                currentUserProfile = snapshot.val();
                
                // 만약 관리자인데 DB에 미승인 상태로 남아있다면 즉시 승인 처리
                if (user.uid === ADMIN_UID && !currentUserProfile.approved) {
                    db.ref('users/' + user.uid).update({ approved: true });
                    currentUserProfile.approved = true;
                }
            }
            renderLeaveUI(); // 유저 프로필이 로드되면 내 휴가 현황 갱신
            renderMyPage(); // 마이페이지 현황 갱신

            // 로그인 상태와 승인 상태에 따라 UI 권한을 업데이트합니다.
            updateUIPermissions(user, currentUserProfile);

            // 관리자 여부를 확인하고 탭 메뉴를 제어합니다.
            if (user.uid === ADMIN_UID) {
                document.getElementById('tab-btn-admin').style.display = 'inline-block';
                listenForUsers(); // 사용자 전체 목록 불러오기
                renderAdminLeaves(); // 팀원 연차 현황 불러오기
            } else {
                document.getElementById('tab-btn-admin').style.display = 'none';
            }
        });
    } else { // 사용자가 로그아웃한 경우
        currentUserProfile = null;
        updateUIPermissions(null, null);
        if (document.getElementById('tab-btn-admin')) {
            document.getElementById('tab-btn-admin').style.display = 'none';
        }
        renderMyPage();
        switchTab('tab-tasks', document.querySelector('.tab-btn')); // 첫번째 탭으로 강제 이동
    }
});

// UI 요소들의 활성화/비활성화 상태를 업데이트하는 함수
function updateUIPermissions(user, profile) {
    const loginBtn = document.getElementById('login-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const userInfo = document.getElementById('user-info');
    const userAvatar = document.getElementById('user-avatar');
    const taskInput = document.getElementById('taskInput');
    const addTaskBtn = document.querySelector('.task-input-area button');
    const assigneeInput = document.getElementById('assigneeInput');
    const priorityInput = document.getElementById('priorityInput');
    const fileInput = document.getElementById('fileInput');
    const uploadBtn = document.querySelector('.upload-area button');
    const addTripBtn = document.getElementById('addTripBtn');

    const isLoggedIn = !!user;
    const isApproved = isLoggedIn && profile && profile.approved;

    // 로그인/로그아웃 버튼 표시
    loginBtn.style.display = isLoggedIn ? 'none' : 'inline-block';
    logoutBtn.style.display = isLoggedIn ? 'inline-block' : 'none';

    if (isLoggedIn) {
        userAvatar.src = user.photoURL || 'https://via.placeholder.com/32';
        userAvatar.style.display = 'block';
        
        if (isApproved) {
            // [상태 1] 로그인 O, 승인 O
            userInfo.textContent = `${user.displayName}님 환영합니다!`;
            [taskInput, addTaskBtn, assigneeInput, priorityInput, fileInput, uploadBtn, addTripBtn].forEach(el => { if (el) el.disabled = false; });
            quill.enable(true); // Quill 에디터 활성화
            taskInput.placeholder = "새로운 업무를 입력하세요...";
        } else {
            // [상태 2] 로그인 O, 승인 X
            userInfo.textContent = `관리자의 승인을 기다리고 있습니다.`;
            [taskInput, addTaskBtn, assigneeInput, priorityInput, fileInput, uploadBtn, addTripBtn].forEach(el => { if (el) el.disabled = true; });
            quill.enable(false); // Quill 에디터 비활성화
            taskInput.placeholder = "승인 대기 중에는 업무를 추가할 수 없습니다.";
        }
    } else {
        // [상태 3] 로그아웃
        userInfo.textContent = '';
        userAvatar.style.display = 'none';
        [taskInput, addTaskBtn, assigneeInput, priorityInput, fileInput, uploadBtn, addTripBtn].forEach(el => { if (el) el.disabled = true; });
        quill.enable(false); // Quill 에디터 비활성화
        taskInput.placeholder = "로그인 후 업무를 추가할 수 있습니다.";
    }
}

// 파일 선택 시 파일명 업데이트
function updateFileName(inputId, displayId) {
    const input = document.getElementById(inputId);
    const display = document.getElementById(displayId);

    if (input.files.length > 0) {
        display.textContent = input.files[0].name;
    } else {
        // 사용자가 파일 선택을 취소했을 때, 원래 상태로 복원
        if (inputId === 'fileInput') {
            display.textContent = '선택된 파일 없음';
        } else {
            const existingUrl = input.dataset.existingUrl;
            const existingPath = input.dataset.existingPath;
            display.textContent = existingUrl ? `현재 첨부됨: ${existingPath.split('_').pop()}` : '';
        }
    }
}

// ----------------------------------------------------
// 1. 칸반 보드 기능
// ----------------------------------------------------
async function addTask() {
    const input = document.getElementById('taskInput');
    const title = input.value.trim();
    const assigneeInput = document.getElementById('assigneeInput');
    const assignee = assigneeInput.value.trim();
    const priorityInput = document.getElementById('priorityInput');
    const priority = priorityInput.value;

    if (!currentUserProfile || !currentUserProfile.approved) {
        await customAlert('관리자의 승인 후 업무를 추가할 수 있습니다.');
        return;
    }

    if (!title) {
        await customAlert('업무 내용을 입력해주세요!');
        input.focus();
        return;
    }

    // 로그인한 사용자 정보 가져오기 (비로그인 상태면 '익명'으로 처리)
    const currentUser = auth.currentUser;
    const authorName = currentUser ? currentUser.displayName : '익명';
    
    // 기본 시작일(startDate)을 오늘 날짜로 자동 지정
    const today = new Date();
    const startDateString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    // Date.now() 대신 파이어베이스의 고유 키(push)를 사용하여 충돌 방지
    const newTaskRef = db.ref('tasks').push();
    newTaskRef.set({ 
        id: newTaskRef.key, title: title, status: 'todo', 
        author: authorName, assignee: assignee, priority: priority, startDate: startDateString 
    })
        .catch(async (error) => {
            console.error("업무 추가 에러:", error);
            await customAlert("업무 추가 실패! 파이어베이스 데이터베이스 규칙을 확인해주세요. (" + error.message + ")");
        });
    input.value = '';
    assigneeInput.value = '';
    priorityInput.value = 'medium'; // 기본값으로 복귀

    // 💡 방금 추가한 업무가 화면에 보이지 않고 숨어버리는 현상 방지!
    // 1. 검색어 창이나 기간 필터가 켜져 있다면 모두 초기화
    document.getElementById('searchAssignee').value = '';
    document.getElementById('dateFilter').value = 'all';

    // 2. 캘린더 모드에서는 마감일이 없는 새 업무가 보이지 않으므로 '상태별 보기'로 자동 전환
    if (currentViewMode === 'calendar') {
        document.getElementById('viewMode').value = 'status';
        toggleViewMode();
        customAlert("달력에는 마감일이 있는 업무만 표시됩니다. \n방금 추가한 업무를 확인하기 위해 '상태별 보기'로 전환했습니다!");
    } else {
        filterTasks(); // 일반 보기일 경우 필터 해제를 즉시 적용
    }
}

// Enter 키로 업무 추가하기
document.getElementById('taskInput').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') addTask();
});
document.getElementById('assigneeInput').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') addTask();
});

async function deleteTask(id) {
    if (!currentUserProfile || !currentUserProfile.approved) {
        await customAlert('승인된 사용자만 업무를 삭제할 수 있습니다.');
        return;
    }
    if(await customConfirm('이 업무를 삭제할까요?')) { db.ref('tasks/' + id).remove(); }
}

function allowDrop(ev) { ev.preventDefault(); }
function drag(ev, id) { ev.dataTransfer.setData("text", id); }
async function drop(ev, newStatus) {
    ev.preventDefault();
    const taskId = ev.dataTransfer.getData("text");
    if (taskId) { 
        if (!currentUserProfile || !currentUserProfile.approved) {
            await customAlert('승인된 사용자만 상태를 변경할 수 있습니다.');
            return;
        }
        db.ref('tasks/' + taskId).update({ status: newStatus })
            .catch(async (error) => {
                console.error("이동 실패:", error);
                await customAlert("상태 변경 실패! 파이어베이스 DB 규칙을 확인하세요.");
            });
    }
}

// 담당자 및 날짜 필터링 기능
function filterTasks() {
    const searchTerm = document.getElementById('searchAssignee').value.toLowerCase().trim();
    const dateFilter = document.getElementById('dateFilter').value;
    const cards = document.querySelectorAll('.task-card');
    
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()); // 오늘 자정
    
    const endOfWeek = new Date(today);
    endOfWeek.setDate(today.getDate() + (6 - today.getDay())); // 이번 주 토요일
    
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0); // 이번 달 말일

    // 컬럼별 보여지는 카드 개수를 담을 객체 초기화
    const counts = { todo: 0, doing: 0, done: 0, week: 0, month: 0, later: 0 };

    cards.forEach(card => {
        const assignee = card.dataset.assignee.toLowerCase();
        const dueDateStr = card.dataset.dueDate;
        
        let nameMatch = assignee.includes(searchTerm);
        let dateMatch = true;

        if (dateFilter !== 'all') {
            if (!dueDateStr) {
                dateMatch = false; // 마감일이 없는 업무는 필터에서 제외
            } else {
                const taskDate = new Date(dueDateStr);
                taskDate.setHours(0, 0, 0, 0);

                // 선택된 기간보다 마감일이 같거나 이전(과거)인 업무들을 보여줍니다. (기한 초과 업무 포함)
                if (dateFilter === 'today') { dateMatch = taskDate <= today; } 
                else if (dateFilter === 'week') { dateMatch = taskDate <= endOfWeek; } 
                else if (dateFilter === 'month') { dateMatch = taskDate <= endOfMonth; }
            }
        }

        // 이름과 날짜 조건이 모두 맞을 때만 카드를 보여줍니다.
        if (nameMatch && dateMatch) { 
            card.style.display = 'flex'; 
            // 카드가 속한 컬럼을 찾아 개수를 1씩 증가시킵니다.
            if (card.parentElement) {
                const colId = card.parentElement.id.replace('-list', '');
                if (counts[colId] !== undefined) counts[colId]++;
            }
        } else { 
            card.style.display = 'none'; 
        }
    });

    // 화면의 개수 배지 업데이트
    Object.keys(counts).forEach(col => {
        const badge = document.getElementById(`count-${col}`);
        if (badge) badge.textContent = counts[col];
    });

    // 캘린더 보기 모드일 때의 담당자 필터링
    const calTasks = document.querySelectorAll('.calendar-task');
    calTasks.forEach(taskEl => {
        const assignee = taskEl.dataset.assignee.toLowerCase();
        if (assignee.includes(searchTerm)) { taskEl.style.display = 'block'; }
        else { taskEl.style.display = 'none'; }
    });

    // 간트 차트 보기 모드일 때의 담당자 필터링
    const ganttRows = document.querySelectorAll('.gantt-row');
    ganttRows.forEach(row => {
        // 출장 통합 줄(Row)인 경우 내부 바(Bar)들을 각각 필터링
        const tripGroups = row.querySelectorAll('.gantt-trip-group');
        if (tripGroups.length > 0) {
            let rowHasVisibleTrip = false;
            tripGroups.forEach(bar => {
                const assignee = (bar.dataset.assignee || '').toLowerCase();
                if (assignee.includes(searchTerm)) {
                    bar.style.display = 'flex';
                    rowHasVisibleTrip = true;
                } else {
                    bar.style.display = 'none';
                }
            });
            row.style.display = rowHasVisibleTrip ? 'flex' : 'none';
        } else {
            // 일반 업무 줄(Row)인 경우
            const assignee = (row.dataset.assignee || '').toLowerCase();
            if (assignee.includes(searchTerm)) { row.style.display = 'flex'; }
            else { row.style.display = 'none'; }
        }
    });

    // 출장 카드 필터링 (담당자 및 날짜 동시 적용)
    const tripCards = document.querySelectorAll('.trip-card');
    tripCards.forEach(card => {
        const assignee = (card.dataset.assignee || '').toLowerCase();
        const dateStr = card.dataset.date;
        
        let nameMatch = assignee.includes(searchTerm);
        let dateMatch = true;

        if (dateFilter !== 'all') {
            if (!dateStr) {
                dateMatch = false; // 날짜가 없는 출장은 필터에서 제외
            } else {
                const tripDate = new Date(dateStr);
                tripDate.setHours(0, 0, 0, 0);

                if (dateFilter === 'today') { dateMatch = tripDate <= today; } 
                else if (dateFilter === 'week') { dateMatch = tripDate <= endOfWeek; } 
                else if (dateFilter === 'month') { dateMatch = tripDate <= endOfMonth; }
            }
        }

        if (nameMatch && dateMatch) { card.style.display = 'flex'; } 
        else { card.style.display = 'none'; }
    });
}

// ----------------------------------------------------
// 모달 창 기능 (업무 상세 설명)
// ----------------------------------------------------
let currentModalTaskId = null;

function openModal(taskId, title, description, dueDate, startDate) {
    currentModalTaskId = taskId;
    document.getElementById('modalTitle').textContent = title;
    document.getElementById('modalDescription').value = description || '';
    document.getElementById('modalStartDate').value = startDate || '';
    document.getElementById('modalDueDate').value = dueDate || '';
    document.getElementById('taskModal').style.display = 'flex';
}

function closeModal() {
    document.getElementById('taskModal').style.display = 'none';
    currentModalTaskId = null;
}

async function saveDescription() {
    if (!currentUserProfile || !currentUserProfile.approved) {
        await customAlert('승인된 사용자만 상세 내용을 저장할 수 있습니다.');
        return;
    }
    if (!currentModalTaskId) return;
    const newDesc = document.getElementById('modalDescription').value.trim();
    const newStartDate = document.getElementById('modalStartDate').value;
    const newDueDate = document.getElementById('modalDueDate').value;
    
    db.ref('tasks/' + currentModalTaskId).update({ description: newDesc, startDate: newStartDate, dueDate: newDueDate })
        .then(() => {
            closeModal();
        }).catch(async error => {
            console.error("설명 저장 실패:", error);
            await customAlert("상세 설명 저장에 실패했습니다.");
        });
}

// 모달 창 바깥 배경 클릭 시 닫기
window.addEventListener('click', (e) => {
    const modal = document.getElementById('taskModal');
    if (e.target === modal) closeModal();
    
    const tripModal = document.getElementById('tripModal');
    if (e.target === tripModal) closeTripModal();

    const tripGroupModal = document.getElementById('tripGroupModal');
    if (e.target === tripGroupModal) closeTripGroupModal();

    const commonCalendarModal = document.getElementById('commonCalendarModal');
    if (e.target === commonCalendarModal) closeCommonCalendarModal();
});

// ----------------------------------------------------
// 통합 캘린더 모달 (어디서든 띄울 수 있는 공통 팝업)
// ----------------------------------------------------
let currentDateForModalCalendar = new Date();

function openCommonCalendarModal() {
    document.getElementById('commonCalendarModal').style.display = 'flex';
    renderModalCalendar();
}

function closeCommonCalendarModal() {
    document.getElementById('commonCalendarModal').style.display = 'none';
}

function changeModalMonth(offset) {
    currentDateForModalCalendar.setMonth(currentDateForModalCalendar.getMonth() + offset);
    renderModalCalendar();
}

function renderModalCalendar() {
    // 전체 데이터(업무+출장+휴가) 즉석 병합
    const priorityWeight = { 'high': 3, 'medium': 2, 'low': 1 };
    const tasksArray = Object.values(globalTasksData).sort((a, b) => {
        const weightA = priorityWeight[a.priority] || 2;
        const weightB = priorityWeight[b.priority] || 2;
        return weightB - weightA;
    });
    const tripsArray = Object.values(globalTripsData).map(trip => ({
        ...trip, isTrip: true, title: `⚑ [출장] ${trip.name}`, startDate: trip.date, dueDate: trip.date, status: 'todo'
    }));
    const leavesArray = Object.values(globalLeavesData).filter(l => l.status === 'approved').map(l => ({
        id: l.id, isLeave: true, title: `[휴가] ${l.userName} ${l.subType === '0.5am' ? '(오전)' : l.subType === '0.5pm' ? '(오후)' : ''}`,
        name: `[휴가] ${l.userName} ${l.subType === '0.5am' ? '(오전 반차)' : l.subType === '0.5pm' ? '(오후 반차)' : ''}`,
        assignee: l.userName, startDate: l.date, dueDate: l.date, status: 'todo', priority: 'medium'
    }));
    const combinedArray = [...tasksArray, ...tripsArray, ...leavesArray];

    const grid = document.getElementById('modal-calendar-grid');
    grid.innerHTML = '';
    
    const year = currentDateForModalCalendar.getFullYear();
    const month = currentDateForModalCalendar.getMonth();
    
    document.getElementById('modal-calendar-month-year').textContent = `${year}년 ${month + 1}월`;
    
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();
    
    const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
    dayNames.forEach((day, index) => {
        const header = document.createElement('div');
        header.className = 'calendar-day-header';
        if (index === 0) header.classList.add('sun');
        if (index === 6) header.classList.add('sat');
        header.textContent = day;
        grid.appendChild(header);
    });
    
    const today = new Date();
    let currentDay = 1;
    let nextMonthDay = 1;
    
    for (let i = 0; i < 42; i++) {
        const cell = document.createElement('div');
        cell.className = 'calendar-day';
        
        let cellDate;
        if (i < firstDay) {
            cell.classList.add('other-month');
            const d = daysInPrevMonth - firstDay + i + 1;
            cell.innerHTML = `<div class="calendar-date">${d}</div>`;
            cellDate = new Date(year, month - 1, d);
        } else if (currentDay <= daysInMonth) {
            if (year === today.getFullYear() && month === today.getMonth() && currentDay === today.getDate()) {
                cell.classList.add('today');
            }
            cell.innerHTML = `<div class="calendar-date">${currentDay}</div>`;
            cellDate = new Date(year, month, currentDay);
            currentDay++;
        } else {
            cell.classList.add('other-month');
            cell.innerHTML = `<div class="calendar-date">${nextMonthDay}</div>`;
            cellDate = new Date(year, month + 1, nextMonthDay);
            nextMonthDay++;
        }
        
        const dateString = `${cellDate.getFullYear()}-${String(cellDate.getMonth() + 1).padStart(2, '0')}-${String(cellDate.getDate()).padStart(2, '0')}`;
        
        combinedArray.forEach(task => {
            if (task.dueDate === dateString) {
                const taskEl = document.createElement('div');
                taskEl.className = 'calendar-task';
                taskEl.title = task.title;
                
                let statusIcon = '';
                if (task.isLeave) statusIcon = '🌴 ';
                else if (!task.isTrip && task.status === 'done') statusIcon = '✓ ';
                
                taskEl.textContent = statusIcon + task.title;

                if (task.isLeave) taskEl.style.backgroundColor = '#10B981';
                else if (task.isTrip) taskEl.style.backgroundColor = '#8B5CF6';
                else if (task.priority === 'high') taskEl.style.backgroundColor = 'var(--danger)';
                else if (task.priority === 'low') taskEl.style.backgroundColor = '#10B981';
                else taskEl.style.backgroundColor = '#F59E0B';
                
                if (task.status === 'done' && !task.isTrip) taskEl.classList.add('task-done-style');
                
                // 팝업 안의 일정을 누르면, 팝업을 닫으면서 동시에 상세 수정창 띄우기
                if (task.isLeave) {
                    taskEl.onclick = () => customAlert(`🌴 휴가 상세 정보:\n\n신청자: ${task.assignee}\n구분: ${task.name.includes('반차') ? '반차' : '연차'}`);
                } else if (task.isTrip) {
                    taskEl.onclick = () => { closeCommonCalendarModal(); openTripModal(task.id, task.name, task.date, task.assignee, task.contact, task.address, task.scheduleUrl, task.schedulePath, task.qrUrl, task.qrPath); };
                } else {
                    taskEl.onclick = () => { closeCommonCalendarModal(); openModal(task.id, task.title, task.description, task.dueDate, task.startDate); };
                }
                cell.appendChild(taskEl);
            }
        });
        grid.appendChild(cell);
    }
}

// ----------------------------------------------------
// 관리자 기능
// ----------------------------------------------------
// 전체 사용자 목록을 불러와서 대기자와 멤버로 나누어 표시하는 함수
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

        let pendingCount = 0;
        let memberCount = 0;

        Object.keys(users).forEach(uid => {
            const user = users[uid];
            const li = document.createElement('li');
            
            // 이름에 작은따옴표(')가 포함된 경우 발생하는 클릭 버튼 버그 방지
            const safeName = user.displayName ? user.displayName.replace(/'/g, "\\'") : '이름없음';
            
            if (!user.approved) {
                li.innerHTML = `<span>${user.displayName} <small style="color: var(--text-muted); font-weight: normal;">(${user.email})</small></span>
                                <button onclick="approveUser('${uid}', '${safeName}')">승인</button>`;
                approvalListEl.appendChild(li);
                pendingCount++;
            } else {
                const isMe = uid === ADMIN_UID;
                const actionBtn = isMe ? `<span style="font-size: 0.8rem; color: var(--primary); font-weight: bold;">최고 관리자</span>` 
                                       : `<button class="revoke-btn" onclick="revokeUser('${uid}', '${safeName}')">해제</button>`;
                li.innerHTML = `<span>${user.displayName} <small style="color: var(--text-muted); font-weight: normal;">(${user.email})</small></span>
                                ${actionBtn}`;
                memberListEl.appendChild(li);
                memberCount++;
            }
        });
        
        if (pendingCount === 0) approvalListEl.innerHTML = '<li>승인 대기 중인 사용자가 없습니다.</li>';
        if (memberCount === 0) memberListEl.innerHTML = '<li>현재 워크스페이스에 참여 중인 멤버가 없습니다.</li>';
    });
}

// 사용자를 승인하는 함수
async function approveUser(uid, name) {
    if (await customConfirm(`'${name}' 사용자의 수정을 허용하시겠습니까?`)) {
        db.ref('users/' + uid).update({ approved: true }).catch(async (error) => {
            console.error("사용자 승인 에러:", error);
            await customAlert("승인 실패! 파이어베이스 보안 규칙(Rules)에 관리자 UID가 일치하는지 확인해주세요.");
        });
    }
}

// 사용자 승인을 취소(해제)하는 함수
async function revokeUser(uid, name) {
    if (await customConfirm(`'${name}' 사용자의 권한을 해제하시겠습니까?\n더 이상 데이터를 수정하거나 추가할 수 없게 됩니다.`)) {
        db.ref('users/' + uid).update({ approved: false }).catch(async (error) => {
            console.error("권한 해제 에러:", error);
            await customAlert("해제 실패! 파이어베이스 보안 규칙(Rules)을 확인해주세요.");
        });
    }
}

// ----------------------------------------------------
// 데이터 렌더링 및 뷰 모드 제어
// ----------------------------------------------------
let globalTasksData = {};
let globalTripsData = {}; // 출장 데이터 전역 저장용 변수 추가
let currentViewMode = 'status'; // 기본 모드
let currentDateForCalendar = new Date(); // 캘린더 기준 날짜
let currentDateForGantt = new Date(); // 간트 차트 기준 날짜

function toggleViewMode() {
    currentViewMode = document.getElementById('viewMode').value;
    document.getElementById('board-status').style.display = 'none';
    document.getElementById('board-timeline').style.display = 'none';
    document.getElementById('board-calendar').style.display = 'none';
    document.getElementById('board-gantt').style.display = 'none';

    if (currentViewMode === 'status') {
        document.getElementById('board-status').style.display = 'flex';
    } else if (currentViewMode === 'timeline') {
        document.getElementById('board-timeline').style.display = 'flex';
    } else if (currentViewMode === 'calendar') {
        document.getElementById('board-calendar').style.display = 'flex';
    } else if (currentViewMode === 'gantt') {
        document.getElementById('board-gantt').style.display = 'block';
    }
    renderTasks(); // 모드가 바뀌면 화면을 다시 그립니다.
}

function changeMonth(offset) {
    currentDateForCalendar.setMonth(currentDateForCalendar.getMonth() + offset);
    renderTasks();
}

function changeGanttMonth(offset) {
    currentDateForGantt.setMonth(currentDateForGantt.getMonth() + offset);
    renderTasks();
}

function renderCalendar(tasksArray) {
    const grid = document.getElementById('calendar-grid');
    grid.innerHTML = '';
    
    const year = currentDateForCalendar.getFullYear();
    const month = currentDateForCalendar.getMonth();
    
    document.getElementById('calendar-month-year').textContent = `${year}년 ${month + 1}월`;
    
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();
    
    const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
    dayNames.forEach((day, index) => {
        const header = document.createElement('div');
        header.className = 'calendar-day-header';
        if (index === 0) header.classList.add('sun');
        if (index === 6) header.classList.add('sat');
        header.textContent = day;
        grid.appendChild(header);
    });
    
    const today = new Date();
    let currentDay = 1;
    let nextMonthDay = 1;
    
    for (let i = 0; i < 42; i++) { // 6주(42일) 표시
        const cell = document.createElement('div');
        cell.className = 'calendar-day';
        
        let cellDate;
        if (i < firstDay) {
            cell.classList.add('other-month');
            const d = daysInPrevMonth - firstDay + i + 1;
            cell.innerHTML = `<div class="calendar-date">${d}</div>`;
            cellDate = new Date(year, month - 1, d);
        } else if (currentDay <= daysInMonth) {
            if (year === today.getFullYear() && month === today.getMonth() && currentDay === today.getDate()) {
                cell.classList.add('today');
            }
            cell.innerHTML = `<div class="calendar-date">${currentDay}</div>`;
            cellDate = new Date(year, month, currentDay);
            currentDay++;
        } else {
            cell.classList.add('other-month');
            cell.innerHTML = `<div class="calendar-date">${nextMonthDay}</div>`;
            cellDate = new Date(year, month + 1, nextMonthDay);
            nextMonthDay++;
        }
        
        // YYYY-MM-DD 형식으로 포맷팅하여 업무 마감일과 비교
        const dateString = `${cellDate.getFullYear()}-${String(cellDate.getMonth() + 1).padStart(2, '0')}-${String(cellDate.getDate()).padStart(2, '0')}`;
        
        tasksArray.forEach(task => {
            if (task.dueDate === dateString) {
                const taskEl = document.createElement('div');
                taskEl.className = 'calendar-task';
                taskEl.title = task.title;
                taskEl.dataset.assignee = task.assignee || '미지정'; // 검색 필터용
                
                // 상태를 한눈에 알아볼 수 있도록 이모지 아이콘 추가
                let statusIcon = '';
                if (task.isLeave) {
                    statusIcon = '<span class="material-symbols-rounded" style="font-size:1.1em; margin-right:4px; vertical-align:middle;">beach_access</span>';
                } else if (!task.isTrip) {
                    if (task.status === 'done') statusIcon = '<span class="material-symbols-rounded" style="font-size:1.1em; margin-right:4px; vertical-align:middle;">check_circle</span>';
                } else if (task.isTrip) {
                    statusIcon = '<span class="material-symbols-rounded" style="font-size:1.1em; margin-right:4px; vertical-align:middle;">flight_takeoff</span>';
                }
                taskEl.innerHTML = statusIcon;
                taskEl.appendChild(document.createTextNode(task.title));

                // 중요도 및 완료 상태에 따른 색상 처리
                if (task.isLeave) taskEl.style.backgroundColor = '#10B981'; // 휴가는 초록색
                else if (task.isTrip) taskEl.style.backgroundColor = '#8B5CF6'; // 출장은 보라색으로 강조
                else if (task.priority === 'high') taskEl.style.backgroundColor = 'var(--danger)';
                else if (task.priority === 'low') taskEl.style.backgroundColor = '#10B981';
                else taskEl.style.backgroundColor = '#F59E0B';
                
                if (task.status === 'done' && !task.isTrip) {
                    taskEl.classList.add('task-done-style'); // 깔끔한 회색 테마 적용
                }
                
                // 클릭 시 모달 열기
                if (task.isLeave) {
                    taskEl.onclick = () => customAlert(`🌴 휴가 상세 정보:\n\n신청자: ${task.assignee}\n구분: ${task.name.includes('반차') ? '반차' : '연차'}`);
                } else if (task.isTrip) {
                    taskEl.onclick = () => openTripModal(task.id, task.name, task.date, task.assignee, task.contact, task.address, task.scheduleUrl, task.schedulePath, task.qrUrl, task.qrPath);
                } else {
                    taskEl.onclick = () => openModal(task.id, task.title, task.description, task.dueDate, task.startDate);
                }
                cell.appendChild(taskEl);
            }
        });
        
        grid.appendChild(cell);
    }
}

// 겹치는 일정 및 미지정 일정 목록 모달 띄우기 (범용)
function openTripGroupModal(titleText, items) {
    document.getElementById('tripGroupTitle').textContent = titleText;

    const listEl = document.getElementById('tripGroupList');
    listEl.innerHTML = '';

    items.forEach(item => {
        const li = document.createElement('li');
        li.style.cursor = 'pointer';
        li.style.transition = 'transform 0.2s, box-shadow 0.2s';
        li.onmouseover = () => li.style.transform = 'translateY(-2px)';
        li.onmouseout = () => li.style.transform = 'none';

        let icon = item.isLeave ? 'beach_access' : (item.isTrip ? 'flight_takeoff' : 'radio_button_unchecked');
        if (!item.isTrip && !item.isLeave) {
            if (item.status === 'doing') icon = 'pending';
            if (item.status === 'done') icon = 'check_circle';
        }
    const color = item.isLeave ? '#10B981' : (item.isTrip ? '#8B5CF6' : 'var(--text-main)');
    const titleToDisplay = item.isLeave || item.isTrip ? item.name : item.title;
    const subtitle = item.isLeave || item.isTrip
        ? `<span class="material-symbols-rounded" style="font-size:1.1em; vertical-align:middle;">person</span> ${item.assignee || '미지정'} | <span class="material-symbols-rounded" style="font-size:1.1em; vertical-align:middle;">location_on</span> ${item.address || '주소 미입력'}`
        : `<span class="material-symbols-rounded" style="font-size:1.1em; vertical-align:middle;">person</span> ${item.assignee || '미지정'} | 중요도: ${item.priority === 'high' ? '높음' : (item.priority === 'low' ? '낮음' : '보통')}`;

    li.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 0.3rem;">
            <span style="color: ${color}; font-size: 0.95rem; font-weight: 600; display:flex; align-items:center;"><span class="material-symbols-rounded" style="font-size:1.2em; margin-right:4px;">${icon}</span> ${titleToDisplay}</span>
            <span style="font-size: 0.8rem; color: var(--text-muted); font-weight: normal;">${subtitle}</span>
        </div>
    `;
    li.onclick = () => {
        closeTripGroupModal();
        if (item.isLeave) {
            customAlert(`🌴 휴가 상세 정보:\n\n신청자: ${item.assignee}\n구분: ${item.name.includes('반차') ? '반차' : '연차'}`);
        } else if (item.isTrip) {
            openTripModal(item.id, item.name, item.date, item.assignee, item.contact, item.address, item.scheduleUrl, item.schedulePath, item.qrUrl, item.qrPath);
        } else {
            openModal(item.id, item.title, item.description, item.dueDate, item.startDate);
        }
    };
        listEl.appendChild(li);
    });

    document.getElementById('tripGroupModal').style.display = 'flex';
}

function closeTripGroupModal() {
    document.getElementById('tripGroupModal').style.display = 'none';
}

function renderGantt(tasksArray) {
    const header = document.getElementById('gantt-header');
    const body = document.getElementById('gantt-body');
    const todayTime = new Date().setHours(0,0,0,0);
    
    // 헤더 초기화 (고정된 왼쪽 열)
    header.innerHTML = '<div class="gantt-row-label" style="border-right: 2px solid var(--border-color); border-bottom: none; background: transparent;">업무명</div>';
    body.innerHTML = '';

    // 1. 현재 선택된 월의 시작일과 마지막일 계산
    const year = currentDateForGantt.getFullYear();
    const month = currentDateForGantt.getMonth();
    document.getElementById('gantt-month-year').textContent = `${year}년 ${month + 1}월`;

    const startDay = new Date(year, month, 1);
    const endDay = new Date(year, month + 1, 0);
    const totalDays = endDay.getDate();
    const timelineWidth = totalDays * 40;

    // 2. 날짜 헤더 그리기
    for (let i = 1; i <= totalDays; i++) {
        const d = new Date(year, month, i);
        const dayEl = document.createElement('div');
        dayEl.className = 'gantt-day';
        if (d.setHours(0,0,0,0) === todayTime) dayEl.classList.add('today');
        dayEl.textContent = i; // 날짜만 표시
        header.appendChild(dayEl);
    }

    // 3. 데이터 분리 (일반 업무 vs 출장 업무 vs 미지정)
    const undatedItems = tasksArray.filter(t => t.isTrip ? !t.startDate : (t.isLeave ? false : (!t.startDate && !t.dueDate)));
    const datedTrips = tasksArray.filter(t => t.isTrip && t.startDate);
    const datedLeaves = tasksArray.filter(t => t.isLeave && t.startDate);
    const datedTasks = tasksArray.filter(t => !t.isTrip && !t.isLeave && (t.startDate || t.dueDate));

    // 4-1. 날짜 미지정 항목을 하나의 줄(Row)로 통합하여 그리기
    if (undatedItems.length > 0) {
        const undatedRow = document.createElement('div');
        undatedRow.className = 'gantt-row';
        
        const label = document.createElement('div');
        label.className = 'gantt-row-label';
        label.style.color = 'var(--text-muted)';
        label.innerHTML = '<span class="material-symbols-rounded" style="font-size:1.2em; margin-right:6px; vertical-align:middle;">calendar_today</span> 날짜 미지정 (통합)';
        undatedRow.appendChild(label);

        const barArea = document.createElement('div');
        barArea.className = 'gantt-bar-area';
        barArea.style.width = `${timelineWidth}px`;

        const startIndex = Math.round((todayTime - startDay.getTime()) / (1000 * 60 * 60 * 24));
        
        const bar = document.createElement('div');
        bar.className = 'gantt-bar gantt-trip-group'; // 필터 호환용 클래스
        bar.dataset.assignee = undatedItems.map(t => t.assignee || '').join(' ').toLowerCase();
        bar.style.left = `${startIndex * 40}px`;
        bar.style.width = `40px`; 
        bar.style.backgroundColor = 'var(--text-muted)';
        
        // 커서를 올렸을 때 뜨는 정보창(Tooltip) 설정
        bar.title = undatedItems.map(t => `${t.isTrip || t.isLeave ? t.name : t.title} (${t.assignee || '미지정'})`).join('\n');

        if (undatedItems.length > 1) {
            bar.textContent = `${undatedItems.length}건`;
            bar.onclick = () => openTripGroupModal(`🗓 날짜 미지정 목록`, undatedItems);
        } else {
            const item = undatedItems[0];
            bar.textContent = item.assignee || '미지정';
            bar.onclick = () => {
                if (item.isTrip) openTripModal(item.id, item.name, item.date, item.assignee, item.contact, item.address, item.scheduleUrl, item.schedulePath, item.qrUrl, item.qrPath);
                else openModal(item.id, item.title, item.description, item.dueDate, item.startDate);
            }
        }
        barArea.appendChild(bar);
        undatedRow.appendChild(barArea);
        body.appendChild(undatedRow);
    }

    // 4-2. 출장 업무를 하나의 줄(Row)로 통합하여 그리기
    if (datedTrips.length > 0) {
        const tripRow = document.createElement('div');
        tripRow.className = 'gantt-row';
        
        const label = document.createElement('div');
        label.className = 'gantt-row-label';
        label.style.color = '#8B5CF6'; // 보라색
        label.innerHTML = '<span class="material-symbols-rounded" style="font-size:1.2em; margin-right:6px; vertical-align:middle;">flight_takeoff</span> 출장 일정 (통합)';
        tripRow.appendChild(label);

        const barArea = document.createElement('div');
        barArea.className = 'gantt-bar-area';
        barArea.style.width = `${timelineWidth}px`;

        // 날짜별로 출장 그룹화
        const groupedTrips = {};
        datedTrips.forEach(t => {
            let startT = todayTime;
            if (t.startDate) {
                const parsedStart = new Date(t.startDate).setHours(0,0,0,0);
                if (!isNaN(parsedStart)) startT = parsedStart;
            }
            if (!groupedTrips[startT]) groupedTrips[startT] = [];
            groupedTrips[startT].push(t);
        });

        // 그룹화된 막대 그리기
        Object.keys(groupedTrips).forEach(timeStr => {
            const startT = parseInt(timeStr);
            const group = groupedTrips[startT];
            const startIndex = Math.round((startT - startDay.getTime()) / (1000 * 60 * 60 * 24));

            const bar = document.createElement('div');
            bar.className = 'gantt-bar gantt-trip-group';
            bar.dataset.assignee = group.map(t => t.assignee || '').join(' ').toLowerCase(); // 검색 필터용
            bar.style.left = `${startIndex * 40}px`;
            bar.style.width = `40px`; // 출장은 기본 1일로 표시
            bar.style.backgroundColor = '#8B5CF6';
            
            // 커서를 올렸을 때 뜨는 정보창(Tooltip) 설정
            bar.title = group.map(t => `⚑ ${t.name} (${t.assignee || '미지정'})`).join('\n');

            if (group.length > 1) {
                bar.textContent = `${group.length}건`;
                const d = new Date(startT);
                const dateStr = `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
                bar.onclick = () => openTripGroupModal(`⚑ ${dateStr} 출장 목록`, group);
            } else {
                bar.textContent = group[0].assignee || '미지정';
                const trip = group[0];
                bar.onclick = () => openTripModal(trip.id, trip.name, trip.date, trip.assignee, trip.contact, trip.address, trip.scheduleUrl, trip.schedulePath, trip.qrUrl, trip.qrPath);
            }
            barArea.appendChild(bar);
        });
        tripRow.appendChild(barArea);
        body.appendChild(tripRow);
    }

    // 4-3. 휴가 일정을 하나의 줄(Row)로 통합하여 그리기
    if (datedLeaves.length > 0) {
        const leaveRow = document.createElement('div');
        leaveRow.className = 'gantt-row';
        
        const label = document.createElement('div');
        label.className = 'gantt-row-label';
        label.style.color = '#10B981'; // 초록색
        label.innerHTML = '<span class="material-symbols-rounded" style="font-size:1.2em; margin-right:6px; vertical-align:middle;">beach_access</span> 휴가 일정 (통합)';
        leaveRow.appendChild(label);

        const barArea = document.createElement('div');
        barArea.className = 'gantt-bar-area';
        barArea.style.width = `${timelineWidth}px`;

        const groupedLeaves = {};
        datedLeaves.forEach(t => {
            let startT = todayTime;
            if (t.startDate) {
                const parsedStart = new Date(t.startDate).setHours(0,0,0,0);
                if (!isNaN(parsedStart)) startT = parsedStart;
            }
            if (!groupedLeaves[startT]) groupedLeaves[startT] = [];
            groupedLeaves[startT].push(t);
        });

        Object.keys(groupedLeaves).forEach(timeStr => {
            const startT = parseInt(timeStr);
            const group = groupedLeaves[startT];
            const startIndex = Math.round((startT - startDay.getTime()) / (1000 * 60 * 60 * 24));

            const bar = document.createElement('div');
            bar.className = 'gantt-bar gantt-trip-group';
            bar.dataset.assignee = group.map(t => t.assignee || '').join(' ').toLowerCase();
            bar.style.left = `${startIndex * 40}px`;
            bar.style.width = `40px`;
            bar.style.backgroundColor = '#10B981';
            
            bar.title = group.map(t => `🌴 ${t.name}`).join('\n');

            bar.textContent = group.length > 1 ? `${group.length}건` : group[0].assignee || '미지정';
            bar.onclick = () => {
                if (group.length > 1) openTripGroupModal(`🌴 출장/휴가 목록`, group);
                else customAlert(`🌴 휴가 상세 정보:\n\n신청자: ${group[0].assignee}\n구분: ${group[0].name.includes('반차') ? '반차' : '연차'}`);
            };
            barArea.appendChild(bar);
        });
        leaveRow.appendChild(barArea);
        body.appendChild(leaveRow);
    }

    // 5. 일반 업무 막대 그리기
    datedTasks.forEach(task => {
        let startT = todayTime;
        if (task.startDate) {
            const parsedStart = new Date(task.startDate).setHours(0,0,0,0);
            if (!isNaN(parsedStart)) startT = parsedStart;
        }
        
        let dueT = startT;
        if (task.dueDate) {
            const parsedDue = new Date(task.dueDate).setHours(0,0,0,0);
            if (!isNaN(parsedDue)) dueT = parsedDue;
        }
        
        if (dueT < startT) dueT = startT;

        const startIndex = Math.round((startT - startDay.getTime()) / (1000 * 60 * 60 * 24));
        const duration = Math.round((dueT - startT) / (1000 * 60 * 60 * 24)) + 1;

        const row = document.createElement('div');
        row.className = 'gantt-row';
        row.dataset.assignee = task.assignee || '미지정'; // 필터용

        // 왼쪽 라벨
        const label = document.createElement('div');
        label.className = 'gantt-row-label';
        
        // 진행 상태 텍스트 배지 추가
        let statusIcon = '';
        if (!task.isTrip) {
            if (task.status === 'todo') statusIcon = '<span class="material-symbols-rounded" style="font-size:1.1em; margin-right:4px; vertical-align:middle;">radio_button_unchecked</span>';
            else if (task.status === 'doing') statusIcon = '<span class="material-symbols-rounded" style="font-size:1.1em; margin-right:4px; vertical-align:middle;">pending</span>';
            else if (task.status === 'done') statusIcon = '<span class="material-symbols-rounded" style="font-size:1.1em; margin-right:4px; vertical-align:middle;">check_circle</span>';
        }
        label.innerHTML = statusIcon;
        label.appendChild(document.createTextNode(task.title));
        label.title = task.title;
        
        // 바(Bar) 영역
        const barArea = document.createElement('div');
        barArea.className = 'gantt-bar-area';
        barArea.style.width = `${timelineWidth}px`;
        
        const bar = document.createElement('div');
        bar.className = 'gantt-bar';
        bar.style.left = `${startIndex * 40}px`; // 하루 너비를 40px로 계산
        bar.style.width = `${duration * 40}px`;
        
        if (task.priority === 'high') bar.style.backgroundColor = 'var(--danger)';
        else if (task.priority === 'low') bar.style.backgroundColor = '#10B981';
        else bar.style.backgroundColor = '#F59E0B';

        if (task.status === 'done') {
            bar.classList.add('task-done-style'); // 깔끔한 회색 테마 적용
            bar.textContent = task.assignee || '미지정'; // 이모지 제거하여 글자 잘림 방지
        } else {
            bar.textContent = task.assignee || '미지정'; // 이모지 제거하여 글자 잘림 방지
        }

        bar.onclick = () => openModal(task.id, task.title, task.description, task.dueDate, task.startDate);

        barArea.appendChild(bar);
        row.appendChild(label);
        row.appendChild(barArea);
        body.appendChild(row);
    });
}

function renderTasks() {
    // 모든 리스트 비우기
    ['todo-list', 'doing-list', 'done-list', 'week-list', 'month-list', 'later-list'].forEach(id => {
        if (document.getElementById(id)) document.getElementById(id).innerHTML = '';
    });

    if (!globalTasksData) return;

    // 날짜 계산 (일정별 보기를 위해)
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfWeek = new Date(today);
    endOfWeek.setDate(today.getDate() + (6 - today.getDay()));
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    // 중요도에 따라 정렬하기 위해 가중치를 설정합니다. (높음=3, 보통=2, 낮음=1)
    const priorityWeight = { 'high': 3, 'medium': 2, 'low': 1 };
    
    // 데이터를 배열로 변환하고 중요도 순으로 정렬합니다.
    const tasksArray = Object.values(globalTasksData).sort((a, b) => {
        const weightA = priorityWeight[a.priority] || 2; // 값이 없으면 '보통(2)'으로 취급
        const weightB = priorityWeight[b.priority] || 2;
        return weightB - weightA; // 내림차순 정렬 (숫자가 큰 '높음'이 위로 오도록)
    });
    
    // 전체 달성률 계산 및 업데이트
    const totalTasks = tasksArray.length;
    const doneTasks = tasksArray.filter(t => t.status === 'done').length;
    const progressPercent = totalTasks === 0 ? 0 : Math.round((doneTasks / totalTasks) * 100);
    
    const progressFill = document.getElementById('progress-fill');
    const progressText = document.getElementById('progress-text');
    if (progressFill && progressText) {
        progressFill.style.width = progressPercent + '%';
        progressText.textContent = progressPercent + '%';
    }

    // 출장 데이터를 캘린더와 간트 차트용으로 변환하여 기존 업무 배열과 합치기
    const tripsArray = Object.values(globalTripsData).map(trip => ({
        ...trip,
        isTrip: true,
        title: `[출장] ${trip.name}`,
        startDate: trip.date,
        dueDate: trip.date,
        status: 'todo' // 출장 일정은 취소선을 긋지 않음
    }));

    // 휴가 데이터를 캘린더와 간트 차트용으로 변환
    const leavesArray = Object.values(globalLeavesData)
        .filter(l => l.status === 'approved') // 승인된 휴가만 표시
        .map(l => ({
            id: l.id,
            isLeave: true,
            title: `[휴가] ${l.userName} ${l.subType === '0.5am' ? '(오전)' : l.subType === '0.5pm' ? '(오후)' : ''}`,
            name: `[휴가] ${l.userName} ${l.subType === '0.5am' ? '(오전 반차)' : l.subType === '0.5pm' ? '(오후 반차)' : ''}`, // 툴팁용
            assignee: l.userName,
            startDate: l.date,
            dueDate: l.date,
            status: 'todo',
            priority: 'medium'
        }));

    const combinedArray = [...tasksArray, ...tripsArray, ...leavesArray];

    // 캘린더 모드일 경우 달력만 그리고 종료
    if (currentViewMode === 'calendar') {
        renderCalendar(combinedArray);
        filterTasks(); // 캘린더 안의 업무도 담당자 필터링 적용
        return;
    }

    if (currentViewMode === 'gantt') {
        renderGantt(combinedArray);
        filterTasks(); 
        return;
    }

    tasksArray.forEach(task => {
        const div = document.createElement('div');
        div.className = 'task-card';
        
        // 상태별 보기일 때만 드래그를 허용합니다. (일정별 보기는 날짜 기준이므로 드래그 이동을 막습니다)
        if (currentViewMode === 'status') {
            div.draggable = true;
            div.ondragstart = (e) => drag(e, task.id);
        } else {
            div.draggable = false;
        }

        // 카드를 클릭하면 모달 창 열기 (삭제 버튼 클릭 시에는 열리지 않음)
        div.onclick = (e) => {
            if(e.target.classList.contains('delete-btn')) return;
            openModal(task.id, task.title, task.description, task.dueDate, task.startDate);
        };
        
        // 검색을 위해 담당자 정보를 data 속성에 저장합니다.
        div.dataset.assignee = task.assignee || '미지정';
        div.dataset.dueDate = task.dueDate || ''; // 날짜 필터링용 데이터 추가

        // 중요도에 따른 색상 및 라벨 설정
        let priorityLabel = '';
        let priorityColor = '';
        if (task.priority === 'high') { priorityLabel = '높음'; priorityColor = '#EF4444'; } // 빨강
        else if (task.priority === 'low') { priorityLabel = '낮음'; priorityColor = '#10B981'; } // 초록
        else { priorityLabel = '보통'; priorityColor = '#F59E0B'; } // 주황

        const descIcon = task.description ? '<span style="font-size: 0.7rem; margin-left: 6px; padding: 2px 4px; background-color: var(--col-bg); border-radius: 4px; color: var(--text-muted);" title="상세 설명 있음">상세</span>' : '';
        
        // 마감일이 지났는지 확인하여 경고 아이콘(🔥) 표시 및 색상 변경
        let dueBadge = '';
        if (task.dueDate) {
            const taskDate = new Date(task.dueDate);
            taskDate.setHours(0,0,0,0);
            const isOverdue = taskDate < today && task.status !== 'done';
            const badgeColor = isOverdue ? 'var(--danger)' : 'var(--text-main)';
            const warningText = isOverdue ? '마감지연' : '마감일';
            dueBadge = `<span style="font-size: 0.75rem; color: ${badgeColor}; margin-left: 6px; font-weight: 600;">${warningText} ${task.dueDate}</span>`;
        }

        div.innerHTML = `
            <div style="display: flex; flex-direction: column; gap: 0.5rem; width: 100%;">
                <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                    <span style="font-weight: 500; font-size: 0.95rem;">${task.title}${descIcon}${dueBadge}</span>
                    <button class="delete-btn" onclick="deleteTask('${task.id}')" title="삭제" style="display:flex; align-items:center; justify-content:center; padding:0.2rem;"><span class="material-symbols-rounded" style="font-size:1.1em;">close</span></button>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.75rem;">
                    <span style="color: var(--text-muted);">담당: ${task.assignee || '미지정'}</span>
                    <span style="background-color: ${priorityColor}15; color: ${priorityColor}; padding: 0.2rem 0.5rem; border-radius: 4px; font-weight: 600;">${priorityLabel}</span>
                </div>
            </div>
        `;
        
        // 뷰 모드에 따라 알맞은 컬럼에 카드를 추가합니다.
        if (currentViewMode === 'status') {
            const listEl = document.getElementById(`${task.status}-list`);
            if(listEl) listEl.appendChild(div);
        } else {
            let targetList = 'later-list'; // 기본값은 나중/미정
            if (task.dueDate) {
                const taskDate = new Date(task.dueDate);
                taskDate.setHours(0,0,0,0);
                if (taskDate <= endOfWeek) targetList = 'week-list';
                else if (taskDate <= endOfMonth) targetList = 'month-list';
            }
            const listEl = document.getElementById(targetList);
            if(listEl) listEl.appendChild(div); 
        }
    });
    
    // 목록이 새로 그려진 후에도 현재 검색어를 유지하여 필터링합니다.
    filterTasks();
}

// 업무 실시간 동기화
db.ref('tasks').on('value', (snapshot) => {
    globalTasksData = snapshot.val() || {};
    renderTasks();
    renderMyPage();
});

// ----------------------------------------------------
// 1-5. 출장 업무 관리 기능 (Business Trips)
// ----------------------------------------------------
let currentTripId = null;

function openTripModal(id = null, name = '', date = '', assignee = '', contact = '', address = '', scheduleUrl = '', schedulePath = '', qrUrl = '', qrPath = '') {
    currentTripId = id;
    document.getElementById('tripModalTitle').textContent = id ? '출장 업무 수정' : '새 출장 추가';
    document.getElementById('tripName').value = name;
    document.getElementById('tripDate').value = date;
    document.getElementById('tripAssignee').value = assignee;
    document.getElementById('tripContact').value = contact;
    document.getElementById('tripAddress').value = address;
    
    document.getElementById('tripScheduleFile').value = '';
    document.getElementById('tripQrFile').value = '';
    
    // 기존에 업로드된 파일 정보 세팅
    document.getElementById('tripScheduleFile').dataset.existingUrl = scheduleUrl;
    document.getElementById('tripScheduleFile').dataset.existingPath = schedulePath;
    document.getElementById('tripQrFile').dataset.existingUrl = qrUrl;
    document.getElementById('tripQrFile').dataset.existingPath = qrPath;

    document.getElementById('currentScheduleFile').textContent = scheduleUrl ? `현재 첨부됨: ${schedulePath.split('_').pop()}` : '';
    document.getElementById('currentQrFile').textContent = qrUrl ? `현재 첨부됨: ${qrPath.split('_').pop()}` : '';

    document.getElementById('tripModal').style.display = 'flex';
}

function closeTripModal() {
    document.getElementById('tripModal').style.display = 'none';
    currentTripId = null;
}

async function saveTrip() {
    if (!currentUserProfile || !currentUserProfile.approved) {
        await customAlert('승인된 사용자만 출장 업무를 저장할 수 있습니다.');
        return;
    }
    
    const name = document.getElementById('tripName').value.trim();
    if (!name) return await customAlert('출장명을 입력해주세요.');

    const scheduleFile = document.getElementById('tripScheduleFile').files[0];
    const qrFile = document.getElementById('tripQrFile').files[0];
    const maxSize = 10 * 1024 * 1024; // 10MB (바이트 단위)

    if (scheduleFile && scheduleFile.size > maxSize) {
        return await customAlert('타임 테이블 파일의 용량은 10MB를 초과할 수 없습니다.');
    }
    if (qrFile && qrFile.size > maxSize) {
        return await customAlert('만족도 QR 이미지의 용량은 10MB를 초과할 수 없습니다.');
    }

    const saveBtn = document.querySelector('#tripModal .modal-footer button');
    saveBtn.disabled = true;
    saveBtn.textContent = '업로드 중...⏳';

    try {
        let scheduleUrl = document.getElementById('tripScheduleFile').dataset.existingUrl || '';
        let schedulePath = document.getElementById('tripScheduleFile').dataset.existingPath || '';
        let qrUrl = document.getElementById('tripQrFile').dataset.existingUrl || '';
        let qrPath = document.getElementById('tripQrFile').dataset.existingPath || '';

        // 스토리지에 파일 업로드
        if (scheduleFile) {
            const path = 'trip_attachments/' + Date.now() + '_schedule_' + scheduleFile.name;
            const snapshot = await storage.ref(path).put(scheduleFile);
            scheduleUrl = await snapshot.ref.getDownloadURL();
            schedulePath = path;
        }
        if (qrFile) {
            const path = 'trip_attachments/' + Date.now() + '_qr_' + qrFile.name;
            const snapshot = await storage.ref(path).put(qrFile);
            qrUrl = await snapshot.ref.getDownloadURL();
            qrPath = path;
        }

        const tripData = {
            name: name,
            date: document.getElementById('tripDate').value,
            assignee: document.getElementById('tripAssignee').value.trim(),
            contact: document.getElementById('tripContact').value.trim(),
            address: document.getElementById('tripAddress').value.trim(),
            scheduleUrl: scheduleUrl,
            schedulePath: schedulePath,
            qrUrl: qrUrl,
            qrPath: qrPath
        };

        if (currentTripId) {
            await db.ref('businessTrips/' + currentTripId).update(tripData);
        } else {
            tripData.timestamp = Date.now();
            const newRef = db.ref('businessTrips').push();
            tripData.id = newRef.key;
            await newRef.set(tripData);
        }
        closeTripModal();
    } catch (error) {
        console.error("출장 파일 업로드 에러:", error);
        await customAlert("업로드 실패: " + error.message);
    } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = '저장';
    }
}

async function deleteTrip(id) {
    if (!currentUserProfile || !currentUserProfile.approved) return await customAlert('승인된 사용자만 삭제할 수 있습니다.');
    if (!await customConfirm('이 출장 일정을 삭제하시겠습니까? (첨부된 파일도 함께 삭제됩니다)')) return;
    
    // 스토리지에서 파일도 함께 삭제
    db.ref('businessTrips/' + id).once('value').then(snapshot => {
        const trip = snapshot.val();
        if (trip) {
            if (trip.schedulePath) storage.ref(trip.schedulePath).delete().catch(e => console.error(e));
            if (trip.qrPath) storage.ref(trip.qrPath).delete().catch(e => console.error(e));
            db.ref('businessTrips/' + id).remove();
        }
    });
}

// 출장 업무 실시간 동기화 및 렌더링
db.ref('businessTrips').on('value', (snapshot) => {
    globalTripsData = snapshot.val() || {};
    renderTasks(); // 캘린더와 간트 차트에도 즉시 렌더링 반영
    renderMyPage();
    
    const tripList = document.getElementById('trip-list');
    if (!tripList) return;
    tripList.innerHTML = '';
    const data = snapshot.val();
    if (!data) return;

    const tripsArray = Object.values(data).sort((a, b) => {
        const dateA = a.date ? new Date(a.date).getTime() : Infinity; // 날짜가 없으면 맨 뒤로 보냄
        const dateB = b.date ? new Date(b.date).getTime() : Infinity;
        if (dateA === dateB) {
            return b.timestamp - a.timestamp; // 날짜가 같으면 최근에 등록된 순서로
        }
        return dateA - dateB; // 출장일이 빠른 순서대로 오름차순 정렬
    });
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    tripsArray.forEach(trip => {
        const div = document.createElement('div');
        div.className = 'trip-card';
        
        if (trip.date) {
            const tripDate = new Date(trip.date);
            tripDate.setHours(0, 0, 0, 0);
            if (tripDate < today) div.classList.add('past-trip');
        }

        div.dataset.assignee = trip.assignee || '미지정';
        div.dataset.date = trip.date || '';
        
        // 첨부파일 형식의 버튼 생성
        let attachBtnsHtml = '<div class="trip-attachment-btns">';
        if (trip.scheduleUrl) {
            attachBtnsHtml += `<a href="${trip.scheduleUrl}" target="_blank" class="trip-attach-btn" style="text-decoration: none;"><span class="material-symbols-rounded" style="font-size:1.1em;">article</span> 타임 테이블 보기</a>`;
        }
        if (trip.qrUrl) {
            attachBtnsHtml += `<a href="${trip.qrUrl}" target="_blank" class="trip-attach-btn" style="text-decoration: none;"><span class="material-symbols-rounded" style="font-size:1.1em;">qr_code_2</span> 만족도 QR 보기</a>`;
        }
        attachBtnsHtml += '</div>';
        
        // 만약 둘 다 없으면 빈 div 렌더링
        if (!trip.scheduleUrl && !trip.qrUrl) attachBtnsHtml = '';

        div.innerHTML = `
            <div class="trip-header">
                <div><div class="trip-title">${trip.name}</div><div class="trip-date">${trip.date || '날짜 미정'} | <span class="material-symbols-rounded" style="font-size:1.1em; vertical-align:middle;">person</span> ${trip.assignee || '미지정'}</div></div>
                <div style="display: flex; gap: 0.3rem;">
                    <button class="delete-btn edit-trip-btn" style="padding: 0.3rem 0.5rem; background-color: var(--col-bg); color: var(--text-main); display:flex; align-items:center;"><span class="material-symbols-rounded" style="font-size:1.1em;">edit</span></button>
                    <button class="delete-btn del-trip-btn" style="padding: 0.3rem 0.5rem; display:flex; align-items:center;"><span class="material-symbols-rounded" style="font-size:1.1em;">close</span></button>
                </div>
            </div>
            <div class="trip-info-row"><span class="material-symbols-rounded trip-info-icon" style="font-size:1.1em;">location_on</span> ${trip.address ? `<a href="https://map.naver.com/v5/search/${encodeURIComponent(trip.address)}" target="_blank" style="color: var(--primary); text-decoration: underline; text-underline-offset: 3px; font-weight: 600;" title="네이버 지도로 위치 보기">${trip.address}</a>` : '<span>주소 미입력</span>'}</div>
            <div class="trip-info-row"><span class="material-symbols-rounded trip-info-icon" style="font-size:1.1em;">call</span> <span>${trip.contact || '연락처 미입력'}</span></div>
            ${attachBtnsHtml}
        `;
        
        div.querySelector('.edit-trip-btn').onclick = () => openTripModal(trip.id, trip.name, trip.date, trip.assignee, trip.contact, trip.address, trip.scheduleUrl, trip.schedulePath, trip.qrUrl, trip.qrPath);
        div.querySelector('.del-trip-btn').onclick = () => deleteTrip(trip.id);

        tripList.appendChild(div);
    });
    
    filterTasks(); // 목록이 새로 그려진 후에도 현재 검색어를 유지하여 필터링합니다.
});

// ----------------------------------------------------
// 2. 실시간 문서 기능
// ----------------------------------------------------
let isTyping = false;

const quill = new Quill('#editor-container', {
    theme: 'snow',
    modules: {
        toolbar: [
            [{ 'header': [1, 2, 3, false] }],
            ['bold', 'italic', 'underline', 'strike'],
            [{ 'list': 'ordered'}, { 'list': 'bullet' }],
            ['link', 'image'],
            ['clean']
        ]
    },
    placeholder: '회의록이나 아이디어를 자유롭게 작성하세요...'
});

// 사용자가 에디터에 타이핑할 때 Firebase로 변경된 HTML 전송
quill.on('text-change', function(delta, oldDelta, source) {
    if (source === 'user') {
        // UI에서 비활성화 되어있지만, 만약을 위한 이중 방어 코드
        if (!currentUserProfile || !currentUserProfile.approved) return;
        isTyping = true;
        db.ref('sharedNote').set(quill.root.innerHTML);
        
        // 타이핑 상태를 DB에 브로드캐스트
        db.ref('typingStatus').set({
            name: currentUserProfile.displayName,
            time: Date.now()
        });
        
        clearTimeout(window.typingTimer);
        window.typingTimer = setTimeout(() => { 
            isTyping = false; 
            db.ref('typingStatus').remove(); // 1초 동안 입력이 없으면 상태 삭제
        }, 1000);
    }
});

db.ref('sharedNote').on('value', (snapshot) => {
    if (!isTyping) { 
        const content = snapshot.val() || '';
        if (quill.root.innerHTML !== content) {
            quill.root.innerHTML = content;
        }
    }
});

// 다른 사용자의 타이핑 상태 감지
db.ref('typingStatus').on('value', (snapshot) => {
    const indicator = document.getElementById('typing-indicator');
    const data = snapshot.val();
    
    if (data && data.name && (Date.now() - data.time < 3000)) {
        // 본인이 입력 중일 때는 텍스트를 띄우지 않습니다.
        if (currentUserProfile && data.name === currentUserProfile.displayName) return indicator.classList.remove('active');
        
        indicator.textContent = `⋯ ${data.name}님이 작성 중입니다...`;
        indicator.classList.add('active');
    } else {
        indicator.classList.remove('active');
    }
});

// ----------------------------------------------------
// 3. 파일 업로드 기능
// ----------------------------------------------------
async function uploadFile() {
    const fileInput = document.getElementById('fileInput');
    const file = fileInput.files[0];
    const statusMsg = document.getElementById('uploadStatus');
    const currentUser = auth.currentUser;

    if (!currentUserProfile || !currentUserProfile.approved) {
        await customAlert('승인된 사용자만 파일을 업로드할 수 있습니다.');
        return;
    }

    if (!file) return await customAlert('파일을 선택해주세요.');
    if (!currentUser) return await customAlert('로그인 후 파일을 업로드할 수 있습니다.');

    const maxSize = 10 * 1024 * 1024; // 10MB (바이트 단위)
    if (file.size > maxSize) {
        await customAlert('파일 용량은 10MB를 초과할 수 없습니다.');
        fileInput.value = '';
        updateFileName('fileInput', 'fileNameDisplay'); // 화면의 파일명도 초기화
        return;
    }

    statusMsg.innerText = '업로드 중...';
    // 삭제 기능을 위해 파일 경로를 변수에 저장합니다.
    const filePath = 'uploads/' + Date.now() + '_' + file.name;
    const storageRef = storage.ref(filePath);
    
    storageRef.put(file).then((snapshot) => {
        snapshot.ref.getDownloadURL().then((url) => {
            // DB에 저장할 때 파일 경로(path)도 함께 저장합니다.
            const newFileRef = db.ref('files').push();
            newFileRef.set({ 
                id: newFileRef.key,
                name: file.name, 
                url: url, 
                path: filePath, // 삭제 시 사용할 파일 경로
                timestamp: Date.now() 
            }).catch(async e => {
                console.error("DB 저장 실패:", e);
                await customAlert("파일은 올라갔지만 목록 저장에 실패했습니다.");
            });
            statusMsg.innerText = '업로드 완료!';
            fileInput.value = '';
            updateFileName('fileInput', 'fileNameDisplay'); // 파일명 표시 리셋
            setTimeout(() => statusMsg.innerText = '', 3000);
        });
    }).catch((error) => {
        // 화면에 정확한 에러 원인을 출력합니다.
        statusMsg.innerText = '업로드 실패: ' + error.message;
        console.error("파일 업로드 에러:", error);
    });
}

// 파일 삭제 기능
async function deleteFile(fileId, filePath) {
    if (!currentUserProfile || !currentUserProfile.approved) {
        await customAlert('승인된 사용자만 파일을 삭제할 수 있습니다.');
        return;
    }

    if (!await customConfirm(`이 파일을 정말 삭제하시겠습니까?\n(${filePath})`)) return;

    // 1. Storage에서 파일 삭제
    storage.ref(filePath).delete().then(() => {
        // 2. 성공 시 Realtime Database에서 파일 정보 삭제
        db.ref('files/' + fileId).remove();
    }).catch(async error => {
        console.error("파일 삭제 실패:", error);
        await customAlert("파일 삭제에 실패했습니다. 스토리지 규칙을 확인해주세요.");
    });
}

// 파일 실시간 동기화
db.ref('files').on('value', (snapshot) => {
    const fileList = document.getElementById('fileList');
    fileList.innerHTML = '';
    const data = snapshot.val();
    if (!data) return;

    const filesArray = Object.values(data).sort((a, b) => b.timestamp - a.timestamp);
    filesArray.forEach(file => {
        const li = document.createElement('li');
        // 삭제 버튼을 추가합니다. 이전에 올린 파일(path 정보가 없는)은 삭제 버튼이 나타나지 않습니다.
        const deleteButtonHTML = file.path 
            ? `<button class="delete-btn file-delete-btn" onclick="deleteFile('${file.id}', '${file.path}')" title="파일 삭제">삭제</button>`
            : '';
        li.innerHTML = `
            <a href="${file.url}" target="_blank">${file.name}</a>
            ${deleteButtonHTML}`;
        fileList.appendChild(li);
    });
});

// ----------------------------------------------------
// 1-6. 휴가 결재 및 관리 기능 (Leave Management)
// ----------------------------------------------------
function toggleLeaveRange() {
    const isRange = document.getElementById('leaveIsRange').checked;
    document.getElementById('leaveEndDate').style.display = isRange ? 'block' : 'none';
    document.getElementById('leaveRangeTilde').style.display = isRange ? 'block' : 'none';
    const typeSelect = document.getElementById('leaveType');
    if (isRange) {
        typeSelect.value = "1";
        typeSelect.disabled = true; // 기간 신청은 '연차(1일)'만 가능
    } else {
        typeSelect.disabled = false;
    }
}

async function applyLeave() {
    if (!currentUserProfile || !currentUserProfile.approved) return await customAlert('승인된 사용자만 휴가를 신청할 수 있습니다.');
    
    const isRange = document.getElementById('leaveIsRange').checked;
    const start = document.getElementById('leaveStartDate').value;
    const end = document.getElementById('leaveEndDate').value;
    const typeVal = document.getElementById('leaveType').value;
    
    let dates = [];
    let deduction = typeVal.startsWith('0.5') ? 0.5 : 1;

    if (!isRange) {
        if (!start) return await customAlert('날짜를 선택하세요.');
        dates.push(start);
    } else {
        if (!start || !end) return await customAlert('시작일과 종료일을 모두 선택하세요.');
        if (start > end) return await customAlert('종료일이 시작일보다 앞설 수 없습니다.');
        let curr = new Date(start);
        let endD = new Date(end);
        while (curr <= endD) {
            if (curr.getDay() !== 0 && curr.getDay() !== 6) { // 주말 제외
                const dStr = `${curr.getFullYear()}-${String(curr.getMonth()+1).padStart(2,'0')}-${String(curr.getDate()).padStart(2,'0')}`;
                dates.push(dStr);
            }
            curr.setDate(curr.getDate() + 1);
        }
        if (dates.length === 0) return await customAlert('선택한 기간 내에 신청 가능한 평일이 없습니다.');
        deduction = 1;
    }

    // 사용 연차 계산 (승인 + 대기)
    let usedLeaves = 0;
    Object.values(globalLeavesData).forEach(l => {
        if (l.uid === auth.currentUser.uid && (l.status === 'approved' || l.status === 'pending')) {
            usedLeaves += l.type;
        }
    });
    const totalLeaves = currentUserProfile.leaveTotal || 15;
    const needed = dates.length * deduction;

    if (totalLeaves - usedLeaves < needed) {
        return await customAlert(`잔여 연차가 부족합니다.\n(필요: ${needed}일, 잔여: ${totalLeaves - usedLeaves}일)`);
    }

    // 중복 신청 및 2명 이상 제한 확인
    for (let d of dates) {
        let peopleOnLeave = 0;
        let alreadyApplied = false;
        Object.values(globalLeavesData).forEach(l => {
            if (l.date === d && l.status !== 'rejected' && l.status !== 'canceled') {
                peopleOnLeave++;
                if (l.uid === auth.currentUser.uid) alreadyApplied = true;
            }
        });
        if (alreadyApplied) return await customAlert(`${d}에는 이미 신청한 휴가가 있습니다.`);
        if (peopleOnLeave >= 2) return await customAlert(`${d}에는 이미 2명이 휴가를 신청하여 더 이상 신청할 수 없습니다.`);
    }

    // 파이어베이스 저장
    const promises = dates.map(d => {
        const newRef = db.ref('leaves').push();
        return newRef.set({
            id: newRef.key,
            uid: auth.currentUser.uid,
            userName: currentUserProfile.displayName,
            date: d,
            type: deduction,
            subType: isRange ? '1' : typeVal,
            status: 'pending',
            timestamp: Date.now()
        });
    });

    // 모든 저장이 파이어베이스 서버에서 완벽히 성공했을 때만 실행
    Promise.all(promises).then(async () => {
        await customAlert(`${dates.length}일의 휴가가 신청되었습니다. 관리자 승인을 대기합니다.`);
        document.getElementById('leaveStartDate').value = '';
        document.getElementById('leaveEndDate').value = '';
    }).catch(async error => {
        console.error("휴가 신청 에러:", error);
        await customAlert("휴가 신청에 실패했습니다! 파이어베이스 보안 규칙(Rules)을 확인해주세요.");
    });
}

function renderLeaveUI() {
    if (!auth.currentUser || !currentUserProfile) return;
    const uid = auth.currentUser.uid;
    let used = 0;
    let myLeaves = [];

    Object.values(globalLeavesData).forEach(l => {
        if (l.uid === uid) {
            myLeaves.push(l);
            if (l.status === 'approved' || l.status === 'pending' || l.status === 'cancel_requested') {
                used += l.type; // 사용된 연차 계산 (대기, 취소요청 포함)
            }
        }
    });

    const total = currentUserProfile.leaveTotal || 15;
    document.getElementById('leave-remain').textContent = (total - used).toFixed(1);
    document.getElementById('leave-used').textContent = used.toFixed(1);

    const listEl = document.getElementById('leave-history-list');
    listEl.innerHTML = '';
    
    myLeaves.sort((a, b) => b.timestamp - a.timestamp); // 최신순 정렬

    if (myLeaves.length === 0) {
        listEl.innerHTML = '<li style="justify-content: center; color: var(--text-muted); font-size: 0.9rem;">휴가 내역이 없습니다.</li>';
        return;
    }

    myLeaves.forEach(l => {
        let statusText, statusColor, btnHtml = '';
        if (l.status === 'pending') { 
            statusText = '승인 대기'; statusColor = '#F59E0B'; 
            btnHtml = `<button class="delete-btn" onclick="cancelLeave('${l.id}')">취소</button>`; 
        } else if (l.status === 'approved') { 
            statusText = l.rejectReason ? '승인 유지 (취소 반려)' : '승인 완료'; 
            statusColor = '#10B981'; 
            btnHtml = `<button class="delete-btn" onclick="cancelLeave('${l.id}')">취소 요청</button>`; 
        } else if (l.status === 'rejected') { 
            statusText = '반려됨'; statusColor = 'var(--danger)'; 
            btnHtml = `<button class="delete-btn" onclick="deleteLeaveRecord('${l.id}')">내역 삭제</button>`; 
        } else if (l.status === 'cancel_requested') { 
            statusText = '취소 대기중'; statusColor = '#8B5CF6'; 
        } else if (l.status === 'canceled') { 
            statusText = '취소 완료'; statusColor = 'var(--text-muted)'; 
            btnHtml = `<button class="delete-btn" onclick="deleteLeaveRecord('${l.id}')">내역 삭제</button>`; 
        }

        const typeStr = l.type === 1 ? '연차' : (l.subType === '0.5pm' ? '오후 반차' : '오전 반차');
        const reasonHtml = l.rejectReason ? `<div style="font-size: 0.8rem; color: var(--danger); margin-top: 0.3rem;">사유: ${l.rejectReason}</div>` : '';

        const li = document.createElement('li');
        li.innerHTML = `
            <div>
                <div style="font-weight: 600; font-size: 0.95rem;">${l.date} - ${typeStr}</div>
                <div style="font-size: 0.8rem; color: ${statusColor}; font-weight: 600; margin-top: 0.3rem;">${statusText}</div>
                ${reasonHtml}
            </div>
            ${btnHtml}
        `;
        listEl.appendChild(li);
    });
}

async function cancelLeave(id) {
    const l = globalLeavesData[id];
    if (!l) return;
    if (l.status === 'pending') {
        if (await customConfirm('신청을 취소하시겠습니까?')) db.ref('leaves/' + id).update({ status: 'canceled' });
    } else if (l.status === 'approved') {
        if (await customConfirm('이미 승인된 휴가입니다. 관리자에게 취소 요청을 보내시겠습니까?')) db.ref('leaves/' + id).update({ status: 'cancel_requested', rejectReason: null });
    }
}

async function deleteLeaveRecord(id) {
    if (await customConfirm('기록을 완전히 삭제하시겠습니까?')) db.ref('leaves/' + id).remove();
}

// 관리자: 팀원 연차 현황 렌더링
function renderAdminLeaves() {
    const container = document.getElementById('admin-leave-list');
    if (!container) return;

    db.ref('users').once('value').then(snap => {
        container.innerHTML = '';
        const pendingLeaves = Object.values(globalLeavesData).filter(l => l.status === 'pending' || l.status === 'cancel_requested');
        
        // 1. 대기 중인 요청 알림 박스
        if (pendingLeaves.length > 0) {
            const pendingDiv = document.createElement('div');
            pendingDiv.style.gridColumn = '1 / -1';
            pendingDiv.style.backgroundColor = '#FEF3C7';
            pendingDiv.style.border = '1px solid #FDE68A';
            pendingDiv.style.padding = '1.2rem';
            pendingDiv.style.borderRadius = '8px';
            pendingDiv.style.marginBottom = '1rem';
            pendingDiv.innerHTML = `<h4 style="margin-top: 0; color: #D97706; margin-bottom: 1rem; display:flex; align-items:center;"><span class="material-symbols-rounded" style="font-size:1.3em; margin-right:6px;">warning</span> 결재 대기 중인 요청 (${pendingLeaves.length}건)</h4>`;
            
            pendingLeaves.forEach(l => {
                const typeStr = l.type === 1 ? '연차' : (l.subType === '0.5pm' ? '오후 반차' : '오전 반차');
                const isCancel = l.status === 'cancel_requested';
                const p = document.createElement('div');
                p.style.display = 'flex';
                p.style.justifyContent = 'space-between';
                p.style.alignItems = 'center';
                p.style.marginBottom = '0.6rem';
                p.style.paddingBottom = '0.6rem';
                p.style.borderBottom = '1px dashed #FCD34D';
                
                p.innerHTML = `
                    <span style="font-size: 0.95rem; color: var(--text-main);">
                        <strong>${l.userName}</strong> - ${l.date} (${typeStr}) 
                        ${isCancel ? '<span style="color: #8B5CF6; font-weight: bold; font-size: 0.85rem;">[취소 요청]</span>' : ''}
                    </span>
                    <div style="display: flex; gap: 0.5rem;">
                        <button onclick="adminResolveLeave('${l.id}', '${isCancel ? 'canceled' : 'approved'}')" style="background-color: #10B981; padding: 0.4rem 0.8rem; font-size: 0.85rem; color: white; border: none; border-radius: 4px; cursor: pointer;">승인</button>
                        <button onclick="adminResolveLeave('${l.id}', '${isCancel ? 'approved' : 'rejected'}')" style="background-color: var(--danger); padding: 0.4rem 0.8rem; font-size: 0.85rem; color: white; border: none; border-radius: 4px; cursor: pointer;">반려</button>
                    </div>
                `;
                pendingDiv.appendChild(p);
            });
            container.appendChild(pendingDiv);
        }

        // 2. 팀원 전체 현황 박스
        const users = snap.val() || {};
        Object.keys(users).forEach(uid => {
            const u = users[uid];
            if (!u.approved) return;
            
            let used = 0;
            Object.values(globalLeavesData).forEach(l => {
                if (l.uid === uid && (l.status === 'approved' || l.status === 'pending' || l.status === 'cancel_requested')) {
                    used += l.type;
                }
            });
            const total = u.leaveTotal || 15;
            
            const card = document.createElement('div');
            card.style.backgroundColor = 'var(--card-bg)';
            card.style.padding = '1.2rem';
            card.style.borderRadius = '12px';
            card.style.border = '1px solid var(--border-color)';
            card.style.boxShadow = 'var(--shadow-sm)';
            card.innerHTML = `
                <div style="font-weight: 700; font-size: 1.05rem; margin-bottom: 0.8rem; color: var(--text-main);">${u.displayName}</div>
                <div style="font-size: 0.9rem; color: var(--text-muted); display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                    <span>잔여: <strong style="color: var(--primary); font-size: 1.1rem;">${(total - used).toFixed(1)}</strong>일</span>
                    <span>사용: <strong style="color: var(--danger);">${used.toFixed(1)}</strong>일</span>
                </div>
                <button onclick="adminEditTotalLeave('${uid}', ${total})" style="width: 100%; margin-top: 0.8rem; background-color: var(--col-bg); color: var(--text-main); border: 1px solid var(--border-color); font-size: 0.85rem; font-weight: 600; padding: 0.4rem; box-shadow: none; border-radius: 6px; cursor: pointer;">총 연차(${total}일) 수정</button>
            `;
            container.appendChild(card);
        });
    });
}

async function adminResolveLeave(id, newStatus) {
    const leave = globalLeavesData[id];
    if (!leave) return;
    
    let updateData = { status: newStatus };
    
    if (leave.status === 'pending' && newStatus === 'rejected') {
        const reason = await customPrompt('반려 사유를 입력하세요 (선택사항):');
        if (reason === null) return; // '취소' 클릭 시 작업 중단
        if (reason.trim() !== '') updateData.rejectReason = reason.trim();
    } else if (leave.status === 'cancel_requested' && newStatus === 'approved') {
        const reason = await customPrompt('취소 반려 사유를 입력하세요 (선택사항):');
        if (reason === null) return; // '취소' 클릭 시 작업 중단
        if (reason.trim() !== '') updateData.rejectReason = reason.trim();
    }
    
    db.ref('leaves/' + id).update(updateData);
}

async function adminEditTotalLeave(uid, currentTotal) {
    const newTotal = await customPrompt('이 팀원의 1년 총 연차 개수를 설정하세요:', currentTotal);
    if (newTotal !== null && !isNaN(newTotal) && newTotal.trim() !== '') {
        db.ref('users/' + uid).update({ leaveTotal: parseFloat(newTotal) })
        .then(async () => await customAlert('성공적으로 수정되었습니다.'));
    }
}

function downloadLeaveCSV() {
    let csvContent = '\uFEFF이름,휴가일자,종류,상태,사유\n';
    Object.values(globalLeavesData).forEach(l => {
        const typeStr = l.type === 1 ? '연차' : (l.subType === '0.5pm' ? '오후 반차' : '오전 반차');
        let statusStr = l.status === 'approved' ? '승인' : (l.status === 'rejected' ? '반려' : (l.status === 'pending' ? '대기' : (l.status === 'canceled' ? '취소됨' : '취소요청')));
        let reasonStr = l.rejectReason ? l.rejectReason.replace(/"/g, '""') : '';
        csvContent += `"${l.userName}","${l.date}","${typeStr}","${statusStr}","${reasonStr}"\n`;
    });
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `팀원_휴가사용내역_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// 휴가 데이터 실시간 동기화 및 토스트 알림 처리
let previousPendingLeaves = new Set();
let isFirstLeavesLoad = true;

db.ref('leaves').on('value', (snapshot) => {
    globalLeavesData = snapshot.val() || {};
    renderTasks(); // 캘린더/간트 차트에 휴가(🌴) 자동 표시
    renderLeaveUI(); // 내 휴가 현황 UI 업데이트
    renderMyPage(); // 마이페이지 업데이트
    
    // 관리자 권한이 있으면 관리자 패널도 즉시 업데이트
    if (auth.currentUser && auth.currentUser.uid === ADMIN_UID) {
        renderAdminLeaves();

        // 새로운 휴가 대기 요청이 들어왔는지 감지하여 토스트 띄우기
        const currentPending = new Set();
        Object.values(globalLeavesData).forEach(l => {
            if (l.status === 'pending' || l.status === 'cancel_requested') {
                currentPending.add(l.id);
                // 처음 로딩할 때 쏟아지는 과거 알림은 무시하고, 진짜 새로 추가된 것만 띄움
                if (!isFirstLeavesLoad && !previousPendingLeaves.has(l.id)) {
                    const isCancel = l.status === 'cancel_requested';
                    const typeStr = l.type === 1 ? '연차' : (l.subType === '0.5pm' ? '오후 반차' : '오전 반차');
                    showToast(`🚨 [${isCancel ? '취소 요청' : '휴가 신청'}]\n${l.userName}님이 ${l.date} (${typeStr}) 결재를 요청했습니다.`, 'warning');
                }
            }
        });
        previousPendingLeaves = currentPending;
    }
    isFirstLeavesLoad = false;
});

// ----------------------------------------------------
// 5. 마이페이지 렌더링 (내 업무, 출장, 휴가)
// ----------------------------------------------------
function renderMyPage() {
    const tasksList = document.getElementById('mypage-tasks');
    const tripsList = document.getElementById('mypage-trips');
    const leavesList = document.getElementById('mypage-leaves');
    
    if (!tasksList || !tripsList || !leavesList) return;
    
    tasksList.innerHTML = '';
    tripsList.innerHTML = '';
    leavesList.innerHTML = '';

    if (!auth.currentUser || !currentUserProfile) {
        const loginMsg = '<li style="justify-content: center; color: var(--text-muted); font-size: 0.9rem;">로그인 후 확인 가능합니다.</li>';
        tasksList.innerHTML = loginMsg;
        tripsList.innerHTML = loginMsg;
        leavesList.innerHTML = loginMsg;
        return;
    }

    const myName = currentUserProfile.displayName;
    const myUid = auth.currentUser.uid;

    // 1. 내 업무 필터링
    const myTasks = Object.values(globalTasksData).filter(t => (t.assignee || '').includes(myName));
    if (myTasks.length === 0) {
        tasksList.innerHTML = '<li style="justify-content: center; color: var(--text-muted); font-size: 0.9rem;">할당된 업무가 없습니다.</li>';
    } else {
        myTasks.sort((a, b) => (a.dueDate || '9999-99-99').localeCompare(b.dueDate || '9999-99-99')).forEach(task => {
            const li = document.createElement('li');
            li.style.flexDirection = 'column';
            li.style.alignItems = 'flex-start';
            li.style.gap = '0.4rem';
            li.style.cursor = 'pointer';
            li.onclick = () => openModal(task.id, task.title, task.description, task.dueDate, task.startDate);
            
            let statusStr = task.status === 'todo' ? '시작 전' : (task.status === 'doing' ? '진행 중' : '완료');
            let statusColor = task.status === 'done' ? 'var(--text-muted)' : 'var(--primary)';
            
            li.innerHTML = `
                <div style="font-weight: 600; font-size: 0.95rem; ${task.status === 'done' ? 'text-decoration: line-through; color: var(--text-muted);' : ''}">${task.title}</div>
                <div style="font-size: 0.8rem; display: flex; gap: 0.8rem; color: var(--text-muted);">
                    <span>상태: <strong style="color: ${statusColor};">${statusStr}</strong></span>
                    <span>마감: ${task.dueDate || '미정'}</span>
                </div>
            `;
            tasksList.appendChild(li);
        });
    }

    // 2. 내 출장 필터링
    const myTrips = Object.values(globalTripsData).filter(t => (t.assignee || '').includes(myName));
    if (myTrips.length === 0) {
        tripsList.innerHTML = '<li style="justify-content: center; color: var(--text-muted); font-size: 0.9rem;">예정된 출장이 없습니다.</li>';
    } else {
        myTrips.sort((a, b) => (a.date || '9999-99-99').localeCompare(b.date || '9999-99-99')).forEach(trip => {
            const li = document.createElement('li');
            li.style.flexDirection = 'column';
            li.style.alignItems = 'flex-start';
            li.style.gap = '0.4rem';
            li.style.cursor = 'pointer';
            li.onclick = () => openTripModal(trip.id, trip.name, trip.date, trip.assignee, trip.contact, trip.address, trip.scheduleUrl, trip.schedulePath, trip.qrUrl, trip.qrPath);
            
            li.innerHTML = `
                <div style="font-weight: 600; font-size: 0.95rem;">${trip.name}</div>
                <div style="font-size: 0.8rem; display: flex; gap: 0.8rem; color: var(--text-muted);">
                    <span>날짜: <strong style="color: #8B5CF6;">${trip.date || '미정'}</strong></span>
                    <span>장소: ${trip.address ? trip.address.substring(0, 10) + '...' : '미정'}</span>
                </div>
            `;
            tripsList.appendChild(li);
        });
    }

    // 3. 내 휴가 필터링
    const myLeaves = Object.values(globalLeavesData).filter(l => l.uid === myUid);
    if (myLeaves.length === 0) {
        leavesList.innerHTML = '<li style="justify-content: center; color: var(--text-muted); font-size: 0.9rem;">신청한 휴가가 없습니다.</li>';
    } else {
        myLeaves.sort((a, b) => b.timestamp - a.timestamp).forEach(l => {
            const typeStr = l.type === 1 ? '연차' : (l.subType === '0.5pm' ? '오후 반차' : '오전 반차');
            let statusText = l.status === 'approved' ? '승인됨' : (l.status === 'pending' ? '대기 중' : (l.status === 'rejected' ? '반려됨' : (l.status === 'canceled' ? '취소됨' : '취소 대기')));
            let statusColor = l.status === 'approved' ? '#10B981' : (l.status === 'pending' ? '#F59E0B' : (l.status === 'rejected' ? 'var(--danger)' : 'var(--text-muted)'));

            const li = document.createElement('li');
            li.style.flexDirection = 'column';
            li.style.alignItems = 'flex-start';
            li.style.gap = '0.4rem';
            
            li.innerHTML = `
                <div style="font-weight: 600; font-size: 0.95rem;">${l.date} <span style="font-weight: normal; color: var(--text-muted); font-size: 0.85rem;">(${typeStr})</span></div>
                <div style="font-size: 0.8rem; display: flex; gap: 0.8rem; color: var(--text-muted);">
                    <span>상태: <strong style="color: ${statusColor};">${statusText}</strong></span>
                </div>
            `;
            leavesList.appendChild(li);
        });
    }
}