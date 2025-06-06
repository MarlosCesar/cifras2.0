// Show modal functions
document.addEventListener('DOMContentLoaded', function() {
    const fab = document.getElementById('fab');
    const cloudModal = document.getElementById('cloudModal');
    const modeModal = document.getElementById('modeModal');
    const newTabModal = document.getElementById('newTabModal');

    // Cloud Chords Modal
    fab.addEventListener('click', function() {
        cloudModal.classList.add('active');
    });

    document.getElementById('closeCloud').addEventListener('click', function() {
        cloudModal.classList.remove('active');
    });

    // Mode Modal
    document.querySelectorAll('.fab-btn')[0].addEventListener('click', function() {
        cloudModal.classList.remove('active');
        modeModal.classList.add('active');
    });

    document.getElementById('closeMode').addEventListener('click', function() {
        modeModal.classList.remove('active');
    });

    // New Tab Modal
    document.querySelector('.tab-item.text-purple-600').addEventListener('click', function() {
        newTabModal.classList.add('active');
    });

    document.getElementById('closeNewTab').addEventListener('click', function() {
        newTabModal.classList.remove('active');
    });

    // Close modals when clicking outside
    document.querySelectorAll('.modal-overlay').forEach(modal => {
        modal.addEventListener('click', function(e) {
            if(e.target === this) {
                modal.classList.remove('active');
            }
        });
    });

    // Tab switching functionality
    document.querySelectorAll('.tab-item').forEach(tab => {
        tab.addEventListener('click', function() {
            // Don't toggle the plus button
            if(this.classList.contains('text-purple-600')) return;

            // Update active tab
            document.querySelectorAll('.tab-item').forEach(t => {
                t.classList.remove('active');
                t.classList.add('text-gray-600', 'hover:text-gray-900');
            });

            this.classList.add('active');
            this.classList.remove('text-gray-600', 'hover:text-gray-900');
        });
    });
});
