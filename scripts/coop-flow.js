import { api } from './api.js';

let nickname = '';

document.addEventListener('DOMContentLoaded', () => {
    const playModeModal = document.getElementById('play-mode-modal');
    const nicknameModal = document.getElementById('nickname-modal');
    const coopActionModal = document.getElementById('coop-action-modal');
    const deckModal = document.getElementById('deck-modal');
    const joinRoomModal = document.getElementById('join-room-modal');

    document.querySelector('a[href="select-cases.html"]').addEventListener('click', (e) => {
        e.preventDefault();
        playModeModal.classList.remove('hidden');
    });

    document.getElementById('play-mode-cancel')?.addEventListener('click', () => playModeModal.classList.add('hidden'));

    document.getElementById('play-solo').addEventListener('click', () => {
        window.location.href = 'select-cases.html';
    });

    document.getElementById('play-coop').addEventListener('click', () => {
        playModeModal.classList.add('hidden');
        nicknameModal.classList.remove('hidden');
    });

    document.getElementById('nickname-confirm').addEventListener('click', () => {
        nickname = document.getElementById('nickname-input').value.trim();
        if (!nickname) return alert('Digite um apelido.');
        nicknameModal.classList.add('hidden');
        coopActionModal.classList.remove('hidden');
    });

    document.getElementById('create-room-btn').addEventListener('click', async () => {
        coopActionModal.classList.add('hidden');
        const decksRes = await api.getCoopDecks();
        if (!decksRes.ok) return alert('Erro ao buscar decks.');
        const deckList = document.getElementById('deck-list');
        deckList.innerHTML = '';
        let selectedDeckId = null;
        decksRes.data.forEach(deck => {
            const btn = document.createElement('button');
            btn.className = 'member-option';
            btn.textContent = deck.name;
            btn.addEventListener('click', () => {
                document.querySelectorAll('#deck-list .member-option').forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
                selectedDeckId = deck.id;
                document.getElementById('deck-confirm').disabled = false;
            });
            deckList.appendChild(btn);
        });
        deckModal.classList.remove('hidden');
        document.getElementById('deck-confirm').onclick = async () => {
            if (!selectedDeckId) return;
            const createRes = await api.createPracticeRoom(selectedDeckId);
            if (!createRes.ok) {
                document.getElementById('deck-error').textContent = createRes.data.error;
                return;
            }
            const roomCode = createRes.data.room_code;
            sessionStorage.setItem('nickname', nickname);
            window.location.href = `practice-room.html?room=${roomCode}&nickname=${encodeURIComponent(nickname)}`;
        };
    });

    document.getElementById('join-room-btn').addEventListener('click', () => {
        coopActionModal.classList.add('hidden');
        joinRoomModal.classList.remove('hidden');
    });

    document.getElementById('join-room-confirm').addEventListener('click', async () => {
        const code = document.getElementById('room-code-input').value.trim().toUpperCase();
        if (!code) return;
        const res = await api.checkPracticeRoom(code);
        if (!res.ok) {
            document.getElementById('join-room-error').textContent = res.data.error || 'Sala não encontrada';
            return;
        }
        sessionStorage.setItem('nickname', nickname);
        window.location.href = `practice-room.html?room=${code}&nickname=${encodeURIComponent(nickname)}`;
    });
});