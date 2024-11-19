import dotenv from "dotenv";
import express from "express";
import { Server, Socket } from "socket.io";

import UNIQUE_ID from "./helper/id-generator";
import middleware from "./middleware/middleware";
import router from "./routes/route";
dotenv.config();

const app = express();

// middleware
app.use(middleware);

// routes
app.use(router);

// server
const PORT = process.env.SERVER_PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

const io: Server = new Server(server, {
  cors: {
    origin: "*",
  },
});

interface CONNECTED_USER {
  userId: string;
  position: { lat: number; lng: number };
  userName: string;
  userEmail: string;
  hostPosition: { lat: number; lng: number };
  updatedAt: Date;
  joinAt: Date;
}

interface HOST_ROOM {
  roomId: string;
  position: { lat: number; lng: number };
  totalConnectedUsers: CONNECTED_USER[];
  hostId: string;
  hostName: string;
  hostEmail: string;
  createdAt: Date;
  updatedAt: Date;
}

const rooms: HOST_ROOM[] = [];

io.on("connection", (socket: Socket) => {
  console.log(`User connected: id- ${socket.id}`);

  socket.on("createRoom", (data) => {
    console.log("createRoom, host" + socket.id);

    // check if host already has a room
    const hasHostRoom = rooms.find((room) => room.hostId === socket.id);

    if (!hasHostRoom) {
      const roomId =
        UNIQUE_ID.next().value?.toString() || Math.random().toString();

      // create a new room and add host to it
      socket.join(roomId);

      // room data
      const hostRoom: HOST_ROOM = {
        roomId,
        position: data.position,
        totalConnectedUsers: [],
        hostId: socket.id,
        hostName: data.hostName,
        createdAt: new Date(),
        updatedAt: new Date(),
        hostEmail: data.hostEmail,
      };
      // data add to rooms
      rooms.push(hostRoom);

      // send room data to host
      socket.emit("roomCreated", {
        ...hostRoom,
      });
    }
  });

  socket.on("joinRoom", (data, callback) => {
    console.log("joinRoom");

    // check if room exists
    const roomExists = rooms.find((room) => room.roomId === data.roomId);

    const connectUser: CONNECTED_USER = {
      userId: socket.id,
      joinAt: new Date(),
      position: data.position,
      hostPosition: roomExists?.position || { lat: 0, lng: 0 },
      updatedAt: new Date(),
      userName: data.userName,
      userEmail: data.userEmail,
    };

    if (roomExists) {
      socket.join(data.roomId);
      const hostUser = io.sockets.sockets.get(roomExists.hostId);
      if (hostUser) {
        // update total connected users
        roomExists.totalConnectedUsers.push(connectUser);
        // notify host that user joined room
        hostUser.emit("userJoinedRoom", {
          ...connectUser,
        });
      }
      // msg to joiner
      io.to(`${socket.id}`).emit("roomJoined", {
        roomId: data.roomId,
        joinedAt: new Date(),
        userId: socket.id,
        position: data.position,
        hostPosition: roomExists?.position || { lat: 0, lng: 0 },
        updatedAt: new Date(),
        hostId: roomExists.hostId,
        hostName: roomExists.hostName,
        hostEmail: roomExists.hostEmail,
      });

      callback(true);
    } else {
      io.to(`${socket.id}`).emit("roomJoined", {
        status: "ERROR",
      });

      callback(false);
    }
  });
  socket.on("leaveRoom", (data) => {
    console.log("leaveRoom");

    socket.leave(data.roomId);
    io.to(`${socket.id}`).emit("roomLeft", {
      status: "OK",
    });
    socket.emit("roomLeft", {
      status: "OK",
      userId: socket.id,
    });
  });

  socket.on("updateLocation", (data) => {
    console.log("updateLocation", data);

    io.emit("updateLocationResponse", data);
  });

  socket.on("disconnect", () => {
    console.log(`User disconnected: ${socket.id}`);

    // if host disconnects, destroy room
    const hostRoom = rooms.find((room) => room.hostId === socket.id);
    const viewerRooms = rooms.filter((room) =>
      room.totalConnectedUsers.find((user) => user.userId === socket.id)
    );

    if (hostRoom) {
      // notify users in room that room is destroyed
      for (const user of hostRoom.totalConnectedUsers) {
        io.to(`${user.userId}`).emit("roomDestroyed", {
          status: "OK",
        });
      }
      // remove room from rooms
      rooms.splice(rooms.indexOf(hostRoom), 1);
    }

    if (viewerRooms.length > 0) {
      for (const room of viewerRooms) {
        const hostUser = io.sockets.sockets.get(room.hostId);
        if (hostUser) {
          // info who left the room
          const user = room.totalConnectedUsers.find(
            (user) => user.userId === socket.id
          );

          // remove user from total connected users
          room.totalConnectedUsers = room.totalConnectedUsers.filter(
            (user) => user.userId !== socket.id
          );
          hostUser.emit("userLeftRoom", {
            ...user,
          });
        }
      }
    }
  });
  socket.on("removeRoom", (data) => {
    console.log("removeRoom");
    const room = rooms.find((room) => room.hostId === socket.id);
    if (room) {
      // notify users in room that room is destroyed
      for (const user of room.totalConnectedUsers) {
        io.to(`${user.userId}`).emit("roomDestroyed", {
          status: "OK",
        });
      }
      // remove room from rooms
      rooms.splice(rooms.indexOf(room), 1);
    }
    socket.emit("roomRemoved", {
      status: "OK",
    });
    socket.leave(data.roomId);
  });
});
