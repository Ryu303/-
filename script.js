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
    document.getElementById('theme-toggle').textContent = savedTheme === 'dark' ? '☀️' : '🌙';
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme); // 브라우저에 설정 저장
    document.getElementById('theme-toggle').textContent = newTheme === 'dark' ? '☀️' : '🌙';
}

initTheme(); // 페이지 로드 시 즉시 테마 초기화 실행

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
    }).catch((error) => {
        console.error("로그인 에러:", error);
        // 인앱 브라우저 차단 오류 메시지를 더 친절하게 안내
        if (error.code === 'auth/unauthorized-domain' || error.message.includes('disallowed_useragent')) {
            alert('보안 정책에 따라 앱 내장 브라우저에서는 로그인이 제한됩니다.\n\n우측 상단 메뉴(점 3개)를 눌러 [다른 브라우저로 열기] 또는 [Chrome에서 열기]를 선택해 주세요!');
        } else {
            alert('로그인에 실패했습니다. (' + error.message + ')');
        }
    });
}

function logout() {
    if(confirm('로그아웃 하시겠습니까?')) { auth.signOut(); }
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
                    approved: user.uid === ADMIN_UID // 관리자는 처음부터 자동 승인!
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

            // 로그인 상태와 승인 상태에 따라 UI 권한을 업데이트합니다.
            updateUIPermissions(user, currentUserProfile);

            // 관리자 여부를 확인하고 관리자 패널을 표시/숨김 처리합니다.
            if (user.uid === ADMIN_UID) {
                adminPanel.style.display = 'block';
                listenForUnapprovedUsers(); // 승인 대기 목록 불러오기
            } else {
                adminPanel.style.display = 'none';
            }
        });
    } else { // 사용자가 로그아웃한 경우
        currentUserProfile = null;
        updateUIPermissions(null, null);
        if (adminPanel) adminPanel.style.display = 'none';
    }
});

// UI 요소들의 활성화/비활성화 상태를 업데이트하는 함수
function updateUIPermissions(user, profile) {
    const loginBtn = document.getElementById('login-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const userInfo = document.getElementById('user-info');
    const taskInput = document.getElementById('taskInput');
    const addTaskBtn = document.querySelector('.task-input-area button');
    const assigneeInput = document.getElementById('assigneeInput');
    const priorityInput = document.getElementById('priorityInput');
    const fileInput = document.getElementById('fileInput');
    const uploadBtn = document.querySelector('.upload-area button');

    const isLoggedIn = !!user;
    const isApproved = isLoggedIn && profile && profile.approved;

    // 로그인/로그아웃 버튼 표시
    loginBtn.style.display = isLoggedIn ? 'none' : 'inline-block';
    logoutBtn.style.display = isLoggedIn ? 'inline-block' : 'none';

    if (isLoggedIn) {
        if (isApproved) {
            // [상태 1] 로그인 O, 승인 O
            userInfo.textContent = `${user.displayName}님 환영합니다!`;
            [taskInput, addTaskBtn, assigneeInput, priorityInput, fileInput, uploadBtn].forEach(el => el.disabled = false);
            quill.enable(true); // Quill 에디터 활성화
            taskInput.placeholder = "새로운 업무를 입력하세요...";
        } else {
            // [상태 2] 로그인 O, 승인 X
            userInfo.textContent = `관리자의 승인을 기다리고 있습니다.`;
            [taskInput, addTaskBtn, assigneeInput, priorityInput, fileInput, uploadBtn].forEach(el => el.disabled = true);
            quill.enable(false); // Quill 에디터 비활성화
            taskInput.placeholder = "승인 대기 중에는 업무를 추가할 수 없습니다.";
        }
    } else {
        // [상태 3] 로그아웃
        userInfo.textContent = '';
        [taskInput, addTaskBtn, assigneeInput, priorityInput, fileInput, uploadBtn].forEach(el => el.disabled = true);
        quill.enable(false); // Quill 에디터 비활성화
        taskInput.placeholder = "로그인 후 업무를 추가할 수 있습니다.";
    }
}

// ----------------------------------------------------
// 1. 칸반 보드 기능
// ----------------------------------------------------
function addTask() {
    const input = document.getElementById('taskInput');
    const title = input.value.trim();
    const assigneeInput = document.getElementById('assigneeInput');
    const assignee = assigneeInput.value.trim();
    const priorityInput = document.getElementById('priorityInput');
    const priority = priorityInput.value;

    if (!currentUserProfile || !currentUserProfile.approved) {
        alert('관리자의 승인 후 업무를 추가할 수 있습니다.');
        return;
    }

    if (!title) return;

    // 로그인한 사용자 정보 가져오기 (비로그인 상태면 '익명'으로 처리)
    const currentUser = auth.currentUser;
    const authorName = currentUser ? currentUser.displayName : '익명';

    // Date.now() 대신 파이어베이스의 고유 키(push)를 사용하여 충돌 방지
    const newTaskRef = db.ref('tasks').push();
    newTaskRef.set({ id: newTaskRef.key, title: title, status: 'todo', author: authorName, assignee: assignee, priority: priority })
        .catch((error) => {
            console.error("업무 추가 에러:", error);
            alert("업무 추가 실패! 파이어베이스 데이터베이스 규칙을 확인해주세요. (" + error.message + ")");
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
        alert("달력에는 마감일이 있는 업무만 표시됩니다. \n방금 추가한 업무를 확인하기 위해 '상태별 보기'로 전환했습니다!");
    } else {
        filterTasks(); // 일반 보기일 경우 필터 해제를 즉시 적용
    }
}

function deleteTask(id) {
    if (!currentUserProfile || !currentUserProfile.approved) {
        alert('승인된 사용자만 업무를 삭제할 수 있습니다.');
        return;
    }
    if(confirm('이 업무를 삭제할까요?')) { db.ref('tasks/' + id).remove(); }
}

function allowDrop(ev) { ev.preventDefault(); }
function drag(ev, id) { ev.dataTransfer.setData("text", id); }
function drop(ev, newStatus) {
    ev.preventDefault();
    const taskId = ev.dataTransfer.getData("text");
    if (taskId) { 
        if (!currentUserProfile || !currentUserProfile.approved) {
            alert('승인된 사용자만 상태를 변경할 수 있습니다.');
            return;
        }
        db.ref('tasks/' + taskId).update({ status: newStatus })
            .catch((error) => {
                console.error("이동 실패:", error);
                alert("상태 변경 실패! 파이어베이스 DB 규칙을 확인하세요.");
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
}

// ----------------------------------------------------
// 모달 창 기능 (업무 상세 설명)
// ----------------------------------------------------
let currentModalTaskId = null;

function openModal(taskId, title, description, dueDate) {
    currentModalTaskId = taskId;
    document.getElementById('modalTitle').textContent = title;
    document.getElementById('modalDescription').value = description || '';
    document.getElementById('modalDueDate').value = dueDate || '';
    document.getElementById('taskModal').style.display = 'flex';
}

function closeModal() {
    document.getElementById('taskModal').style.display = 'none';
    currentModalTaskId = null;
}

function saveDescription() {
    if (!currentUserProfile || !currentUserProfile.approved) {
        alert('승인된 사용자만 상세 내용을 저장할 수 있습니다.');
        return;
    }
    if (!currentModalTaskId) return;
    const newDesc = document.getElementById('modalDescription').value.trim();
    const newDueDate = document.getElementById('modalDueDate').value;
    
    db.ref('tasks/' + currentModalTaskId).update({ description: newDesc, dueDate: newDueDate })
        .then(() => {
            closeModal();
        }).catch(error => {
            console.error("설명 저장 실패:", error);
            alert("상세 설명 저장에 실패했습니다.");
        });
}

// 모달 창 바깥 배경 클릭 시 닫기
window.addEventListener('click', (e) => {
    const modal = document.getElementById('taskModal');
    if (e.target === modal) {
        closeModal();
    }
});

// ----------------------------------------------------
// 관리자 기능
// ----------------------------------------------------
// 승인 대기 중인 사용자 목록을 불러오는 함수
function listenForUnapprovedUsers() {
    // 'approved'가 false인 사용자만 필터링해서 가져옵니다.
    db.ref('users').orderByChild('approved').equalTo(false).on('value', (snapshot) => {
        const userListEl = document.getElementById('user-approval-list');
        userListEl.innerHTML = '';
        const users = snapshot.val();
        if (!users) {
            userListEl.innerHTML = '<li>승인 대기 중인 사용자가 없습니다.</li>';
            return;
        }

        Object.keys(users).forEach(uid => {
            const user = users[uid];
            const li = document.createElement('li');
            li.innerHTML = `
                <span>${user.displayName} (${user.email})</span>
                <button onclick="approveUser('${uid}', '${user.displayName}')">승인</button>
            `;
            userListEl.appendChild(li);
        });
    });
}

// 사용자를 승인하는 함수
function approveUser(uid, name) {
    if (confirm(`'${name}' 사용자의 수정을 허용하시겠습니까?`)) {
        db.ref('users/' + uid).update({ approved: true });
    }
}

// ----------------------------------------------------
// 데이터 렌더링 및 뷰 모드 제어
// ----------------------------------------------------
let globalTasksData = {};
let currentViewMode = 'status'; // 기본 모드
let currentDateForCalendar = new Date(); // 캘린더 기준 날짜

function toggleViewMode() {
    currentViewMode = document.getElementById('viewMode').value;
    document.getElementById('board-status').style.display = 'none';
    document.getElementById('board-timeline').style.display = 'none';
    document.getElementById('board-calendar').style.display = 'none';

    if (currentViewMode === 'status') {
        document.getElementById('board-status').style.display = 'flex';
    } else if (currentViewMode === 'timeline') {
        document.getElementById('board-timeline').style.display = 'flex';
    } else if (currentViewMode === 'calendar') {
        document.getElementById('board-calendar').style.display = 'flex';
    }
    renderTasks(); // 모드가 바뀌면 화면을 다시 그립니다.
}

function changeMonth(offset) {
    currentDateForCalendar.setMonth(currentDateForCalendar.getMonth() + offset);
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
                taskEl.textContent = task.title;
                taskEl.title = task.title;
                taskEl.dataset.assignee = task.assignee || '미지정'; // 검색 필터용
                
                // 중요도 및 완료 상태에 따른 색상 처리
                if (task.priority === 'high') taskEl.style.backgroundColor = 'var(--danger)';
                else if (task.priority === 'low') taskEl.style.backgroundColor = '#10B981';
                else taskEl.style.backgroundColor = '#F59E0B';
                
                if (task.status === 'done') {
                    taskEl.style.textDecoration = 'line-through';
                    taskEl.style.opacity = '0.6';
                    taskEl.style.backgroundColor = 'var(--text-muted)';
                }
                
                // 클릭 시 모달 열기
                taskEl.onclick = () => openModal(task.id, task.title, task.description, task.dueDate);
                cell.appendChild(taskEl);
            }
        });
        
        grid.appendChild(cell);
    }
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

    // 캘린더 모드일 경우 달력만 그리고 종료
    if (currentViewMode === 'calendar') {
        renderCalendar(tasksArray);
        filterTasks(); // 캘린더 안의 업무도 담당자 필터링 적용
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
            openModal(task.id, task.title, task.description, task.dueDate);
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
                    <button class="delete-btn" onclick="deleteTask('${task.id}')" title="삭제">X</button>
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
});

// ----------------------------------------------------
// 2. 실시간 문서 기능
// ----------------------------------------------------
let isTyping = false;

// Quill 에디터 초기화
const quill = new Quill('#editor-container', {
    theme: 'snow',
    modules: {
        toolbar: [
            [{ 'header': [1, 2, 3, false] }],
            ['bold', 'italic', 'underline', 'strike'],
            [{ 'list': 'ordered'}, { 'list': 'bullet' }],
            [{ 'color': [] }, { 'background': [] }],
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
        
        clearTimeout(window.typingTimer);
        window.typingTimer = setTimeout(() => { isTyping = false; }, 1000);
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

// ----------------------------------------------------
// 3. 파일 업로드 기능
// ----------------------------------------------------
function uploadFile() {
    const fileInput = document.getElementById('fileInput');
    const file = fileInput.files[0];
    const statusMsg = document.getElementById('uploadStatus');
    const currentUser = auth.currentUser;

    if (!currentUserProfile || !currentUserProfile.approved) {
        alert('승인된 사용자만 파일을 업로드할 수 있습니다.');
        return;
    }

    if (!file) return alert('파일을 선택해주세요.');
    if (!currentUser) return alert('로그인 후 파일을 업로드할 수 있습니다.');

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
            }).catch(e => {
                console.error("DB 저장 실패:", e);
                alert("파일은 올라갔지만 목록 저장에 실패했습니다.");
            });
            statusMsg.innerText = '업로드 완료!';
            fileInput.value = '';
            setTimeout(() => statusMsg.innerText = '', 3000);
        });
    }).catch((error) => {
        // 화면에 정확한 에러 원인을 출력합니다.
        statusMsg.innerText = '업로드 실패: ' + error.message;
        console.error("파일 업로드 에러:", error);
    });
}

// 파일 삭제 기능
function deleteFile(fileId, filePath) {
    if (!currentUserProfile || !currentUserProfile.approved) {
        alert('승인된 사용자만 파일을 삭제할 수 있습니다.');
        return;
    }

    if (!confirm(`이 파일을 정말 삭제하시겠습니까?\n(${filePath})`)) return;

    // 1. Storage에서 파일 삭제
    storage.ref(filePath).delete().then(() => {
        // 2. 성공 시 Realtime Database에서 파일 정보 삭제
        db.ref('files/' + fileId).remove();
    }).catch(error => {
        console.error("파일 삭제 실패:", error);
        alert("파일 삭제에 실패했습니다. 스토리지 규칙을 확인해주세요.");
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