document.addEventListener('DOMContentLoaded', () => {
    // --- Modal Logic (Live Feed) ---
    const viewMoreBtn = document.getElementById('view-more-feed-btn');
    const feedModal = document.getElementById('feed-modal');
    const closeFeedModalBtn = document.getElementById('close-feed-modal');

    if (viewMoreBtn && feedModal) {
        viewMoreBtn.addEventListener('click', () => feedModal.classList.remove('hidden'));
        closeFeedModalBtn.addEventListener('click', () => feedModal.classList.add('hidden'));
        feedModal.addEventListener('click', (e) => { if (e.target === feedModal) feedModal.classList.add('hidden'); });
    }

    // --- Pending Approvals & Modal Logic ---
    const viewReqBtns = document.querySelectorAll('.view-request-btn');
    const pendingBadge = document.getElementById('pending-badge');
    const approvalList = document.getElementById('approval-list');
    const reqModal = document.getElementById('request-modal');
    const closeReqBtn = document.getElementById('close-req-modal');
    
    const reqDefaultActions = document.getElementById('req-default-actions');
    const reqConfirmDenyActions = document.getElementById('req-confirm-deny-actions');
    const denyReasonContainer = document.getElementById('deny-reason-container');
    const denyReasonText = document.getElementById('deny-reason-text');
    
    const btnInitDeny = document.getElementById('btn-init-deny');
    const btnCancelDeny = document.getElementById('btn-cancel-deny');
    const btnApprove = document.getElementById('btn-approve');
    const btnConfirmDeny = document.getElementById('btn-confirm-deny');

    let currentApprovalItem = null;
    let currentEmpName = "";

    viewReqBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            currentApprovalItem = btn.closest('.approval-item');
            currentEmpName = btn.getAttribute('data-emp');
            
            document.getElementById('req-modal-title').textContent = btn.getAttribute('data-title');
            document.getElementById('req-modal-avatar').textContent = btn.getAttribute('data-initials');
            document.getElementById('req-modal-emp').textContent = currentEmpName;
            document.getElementById('req-modal-dept').textContent = btn.getAttribute('data-dept');
            document.getElementById('req-modal-desc').textContent = btn.getAttribute('data-desc');
            document.getElementById('req-modal-file').textContent = btn.getAttribute('data-file');

            denyReasonContainer.classList.add('hidden');
            reqConfirmDenyActions.classList.add('hidden');
            reqDefaultActions.classList.remove('hidden');
            denyReasonText.value = '';
            reqModal.classList.remove('hidden');
        });
    });

    function closeReqModal() {
        reqModal.classList.add('hidden');
        currentApprovalItem = null;
    }
    closeReqBtn.addEventListener('click', closeReqModal);

    btnInitDeny.addEventListener('click', () => {
        reqDefaultActions.classList.add('hidden');
        reqConfirmDenyActions.classList.remove('hidden');
        denyReasonContainer.classList.remove('hidden');
        denyReasonText.focus();
    });

    btnCancelDeny.addEventListener('click', () => {
        reqConfirmDenyActions.classList.add('hidden');
        denyReasonContainer.classList.add('hidden');
        reqDefaultActions.classList.remove('hidden');
    });

    function processAction(actionType) {
        if (!currentApprovalItem) return;
        const itemToAnimate = currentApprovalItem;
        const empNameForToast = currentEmpName;

        itemToAnimate.style.transition = 'all 0.3s ease';
        itemToAnimate.style.transform = 'translateX(30px)';
        itemToAnimate.style.opacity = '0';

        setTimeout(() => {
            itemToAnimate.style.height = itemToAnimate.offsetHeight + 'px';
            itemToAnimate.offsetHeight; 
            itemToAnimate.style.transition = 'all 0.3s ease';
            itemToAnimate.style.height = '0px';
            itemToAnimate.style.padding = '0px';
            itemToAnimate.style.border = 'none';

            setTimeout(() => {
                itemToAnimate.remove();
                updateBadgeCount();
                showToast(actionType === 'approve' ? `Approved ${empNameForToast}` : `Denied ${empNameForToast}`, actionType === 'approve');
            }, 300);
        }, 300);

        closeReqModal();
    }

    btnApprove.addEventListener('click', () => processAction('approve'));
    btnConfirmDeny.addEventListener('click', () => {
        if (denyReasonText.value.trim() === "") {
            denyReasonText.classList.add('ring-2', 'ring-red-500');
            return;
        }
        processAction('deny');
    });

    function showToast(message, isApprove) {
        const toast = document.createElement('div');
        toast.className = `fixed bottom-6 right-6 bg-white border border-gray-200 px-4 py-3 rounded-xl shadow-xl flex items-center gap-3`;
        toast.style.cssText = "z-index: 9999; transform: translateY(20px); opacity: 0; transition: all 0.3s ease;";
        const icon = isApprove ? `<svg class="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>` : `<svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>`;
        toast.innerHTML = `${icon} <span class="text-sm font-medium text-gray-800">${message}</span>`;
        document.body.appendChild(toast);
        requestAnimationFrame(() => { toast.style.transform = "translateY(0)"; toast.style.opacity = "1"; });
        setTimeout(() => {
            toast.style.transform = "translateY(20px)"; toast.style.opacity = "0";
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    function updateBadgeCount() {
        const remainingItems = document.querySelectorAll('.approval-item').length;
        if (remainingItems > 0) {
            pendingBadge.textContent = `${remainingItems} New`;
        } else {
            pendingBadge.style.display = 'none';
            approvalList.innerHTML = `<div class="p-8 text-center"><p class="text-sm font-bold text-gray-800">All caught up!</p></div>`;
        }
    }
});