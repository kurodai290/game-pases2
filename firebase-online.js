
import { initializeApp } from
  "https://www.gstatic.com/firebasejs/12.5.0/firebase-app.js";

import {
  getDatabase,
  ref,
  get,
  set,
  update,
  remove,
  onValue,
  onDisconnect,
  runTransaction,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.5.0/firebase-database.js";

import {
  getAuth,
  signInAnonymously
} from "https://www.gstatic.com/firebasejs/12.5.0/firebase-auth.js";

// Firebase Console の「プロジェクトの設定」から入力
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  databaseURL: "YOUR_DATABASE_URL",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.firebasestorage.app",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth(app);

const MAX_PLAYERS = 6;
const ROOM_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

let currentRoom = null;
let currentPlayer = null;
let roomUnsubscribe = null;

export async function connectFirebase() {
  const result = await signInAnonymously(auth);
  currentPlayer = result.user.uid;
  return currentPlayer;
}

function makeRoomCode() {
  let code = "";

  for (let i = 0; i < 6; i++) {
    code += ROOM_CHARS[
      Math.floor(Math.random() * ROOM_CHARS.length)
    ];
  }

  return code;
}

function roomRef(code) {
  return ref(db, `rooms/${code}`);
}

function playerRef(code, uid = currentPlayer) {
  return ref(db, `rooms/${code}/players/${uid}`);
}

export async function createRoom(playerName) {
  if (!currentPlayer) await connectFirebase();

  for (let attempt = 0; attempt < 10; attempt++) {
    const code = makeRoomCode();
    const room = roomRef(code);

    const result = await runTransaction(room, existing => {
      if (existing !== null) return;
      return {
        hostId: currentPlayer,
        phase: "waiting",
        createdAt: Date.now(),
        players: {
          [currentPlayer]: {
            id: currentPlayer,
            name: String(playerName || "Player").slice(0, 16),
            x: 400,
            y: 300,
            hp: 100,
            kills: 0,
            alive: true,
            connected: true
          }
        },
        game: {
          startedAt: 0,
          updatedAt: serverTimestamp()
        }
      };
    });

    if (result.committed) {
      currentRoom = code;
      await onDisconnect(playerRef(code)).remove();
      return code;
    }
  }

  throw new Error("部屋を作成できませんでした。もう一度お試しください。");
}

export async function joinRoom(code, playerName) {
  if (!currentPlayer) await connectFirebase();

  code = String(code || "").trim().toUpperCase();

  if (!/^[A-HJ-NP-Z2-9]{6}$/.test(code)) {
    throw new Error("部屋コードは6文字で入力してください。");
  }

  const room = roomRef(code);
  const snapshot = await get(room);

  if (!snapshot.exists()) {
    throw new Error("部屋が見つかりません。");
  }

  const data = snapshot.val();

  if (data.phase !== "waiting") {
    throw new Error("この部屋は参加者を募集していません。");
  }

  const players = data.players || {};

  if (Object.keys(players).length >= MAX_PLAYERS) {
    throw new Error("部屋が満員です。");
  }

  await set(playerRef(code), {
    id: currentPlayer,
    name: String(playerName || "Player").slice(0, 16),
    x: 400,
    y: 300,
    hp: 100,
    kills: 0,
    alive: true,
    connected: true
  });

  await onDisconnect(playerRef(code)).remove();

  currentRoom = code;
  return code;
}

export function listenRoom(callback) {
  if (!currentRoom) {
    throw new Error("先に部屋を作成または参加してください。");
  }

  if (roomUnsubscribe) roomUnsubscribe();

  const unsubscribe = onValue(roomRef(currentRoom), snapshot => {
    if (!snapshot.exists()) {
      callback(null);
      return;
    }

    callback({
      code: currentRoom,
      ...snapshot.val()
    });
  });

  roomUnsubscribe = unsubscribe;
  return unsubscribe;
}

export async function updateMyPlayer(changes) {
  if (!currentRoom || !currentPlayer) return;

  const allowed = {};

  for (const key of ["x", "y", "hp", "kills", "alive", "name"]) {
    if (Object.hasOwn(changes, key)) {
      allowed[key] = changes[key];
    }
  }

  if (Object.keys(allowed).length > 0) {
    await update(playerRef(currentRoom), allowed);
  }
}

export async function startGame() {
  if (!currentRoom || !currentPlayer) {
    throw new Error("部屋に参加してください。");
  }

  const room = roomRef(currentRoom);

  const result = await runTransaction(room, data => {
    if (!data || data.hostId !== currentPlayer) return;

    if (data.phase !== "waiting") return;

    const players = data.players || {};
    const count = Object.keys(players).length;

    if (count < 2 || count > MAX_PLAYERS) return;

    data.phase = "playing";
    data.game = {
      startedAt: Date.now(),
      updatedAt: Date.now()
    };

    return data;
  });

  if (!result.committed) {
    throw new Error("開始できません。ホスト権限や参加人数を確認してください。");
  }
}

export async function updateGameState(gameState) {
  if (!currentRoom || !currentPlayer) return;

  const snapshot = await get(roomRef(currentRoom));

  if (!snapshot.exists()) return;

  const room = snapshot.val();

  if (room.hostId !== currentPlayer || room.phase !== "playing") {
    throw new Error("ゲーム状態を更新できるのはホストだけです。");
  }

  await update(ref(db, `rooms/${currentRoom}/game`), {
    ...gameState,
    updatedAt: serverTimestamp()
  });
}

export async function leaveRoom() {
  if (roomUnsubscribe) {
    roomUnsubscribe();
    roomUnsubscribe = null;
  }

  if (currentRoom && currentPlayer) {
    await remove(playerRef(currentRoom));
  }

  currentRoom = null;
}

export function getCurrentRoom() {
  return currentRoom;
}

export function getCurrentPlayer() {
  return currentPlayer;
}
