(function () {
    const token = localStorage.getItem('auth_token');
    const guestId = localStorage.getItem('guest_id');

    // se não for usuário nem visitante
    if (!token && !guestId) {
        window.location.replace('login.html');
    }
})();
