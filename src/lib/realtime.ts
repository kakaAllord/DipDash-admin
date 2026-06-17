"use client";

import { io, type Socket } from "socket.io-client";

/*
  Thin client wrapper around the Dipdash realtime relay (dipdash-server).
  One shared socket per browser tab. Auth is the lightweight { role, id }
  handshake the relay expects (demo-grade — see dipdash-server/index.js).
*/

const URL = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:4000";

let socket: Socket | null = null;

export function getSocket(auth: { role: string; id: string }): Socket {
  if (!socket) {
    socket = io(URL, {
      auth,
      transports: ["websocket", "polling"],
    });
  }
  return socket;
}

export function joinRoom(s: Socket, room: string) {
  s.emit("join", room);
}
export function leaveRoom(s: Socket, room: string) {
  s.emit("leave", room);
}

export interface LocationPing {
  courierId?: string;
  orderId?: string;
  lat: number;
  lng: number;
  at?: number;
}
export interface PresencePing {
  courierId: string;
  online: boolean;
  at?: number;
}
export interface OrderStatusPing {
  orderId: string;
  status: string;
  at?: number;
}

export function emitLocation(s: Socket, p: LocationPing) {
  s.emit("location", p);
}
export function emitPresence(s: Socket, p: PresencePing) {
  s.emit("presence", p);
}
export function emitOrderStatus(s: Socket, p: OrderStatusPing) {
  s.emit("order_status", p);
}
/** Admin broadcasts that the delivery surge changed; price views re-quote. */
export function emitSurge(s: Socket) {
  s.emit("surge");
}
/** A new order needs a courier — nudge the courier pool to refresh its feed. */
export function emitNewOrder(s: Socket) {
  s.emit("new_order");
}
