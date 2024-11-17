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

// Define a custom interface extending the Socket interface
interface CustomSocket extends Socket {
  roomId?: string;
}

const roomCreator = new Map<string, string>(); // roomid => socketid

interface connectedUser {
  userId: string;
  joinAt: Date;
  position: { lat: number; lng: number };
  userName: string;
  updatedAt: Date;
}

interface userRoom {
  roomId: string;
  position: { lat: number; lng: number };
  totalConnectedUsers: connectedUser[];
  hostId: string;
  hostName: string;
  createdAt: Date;
  updatedAt: Date;
}

const rooms: userRoom[] = [];

io.on("connection", (socket: CustomSocket) => {
  console.log(`User connected: ${socket.id}`);

  socket.on("createRoom", (data) => {
    console.log("createRoom");
    // create room
    // check if user already has a room
    const userRoom = rooms.find((room) => room.hostId === socket.id);

    if (!userRoom) {
      const roomId =
        UNIQUE_ID.next().value?.toString() || Math.random().toString();
      // create a new room
      socket.join(roomId);

      const connectedUserRoom = {
        roomId,
        position: data.position,
        totalConnectedUsers: [],
        hostId: socket.id,
        hostName: data.hostName,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      // data add to rooms
      rooms.push(connectedUserRoom);

      socket.emit("roomCreated", {
        ...connectedUserRoom,
      });
    }
  });

  socket.on("joinRoom", (data) => {
    console.log("joinRoom");

    // check if room exists
    const roomExists = rooms.find((room) => room.roomId === data.roomId);
    const connectUser = {
      userId: socket.id,
      joinAt: new Date(),
      position: roomExists?.position || data.position,
      updatedAt: new Date(),
      userName: data.userName,
    };

    if (roomExists) {
      socket.join(data.roomId);

      const hostUser = io.sockets.sockets.get(roomExists.hostId);
      if (hostUser) {
        // update total connected users
        roomExists.totalConnectedUsers.push(connectUser);

        console.log("userJoinedRoom", connectUser);

        hostUser.emit("userJoinedRoom", {
          ...connectUser,
        });
      }
      // msg to joiner
      io.to(`${socket.id}`).emit("roomJoined", {
        status: "OK",
        roomId: data.roomId,
        joinedAt: new Date(),
        userId: socket.id,
        position: roomExists.position,
        updatedAt: new Date(),
        hostId: roomExists.hostId,
        hostName: roomExists.hostName,
        createdAt: new Date(),
      });
      // io.to(`${socket.id}`).emit("userJoinedRoom", {
      //   ...connectUser,
      // });
    } else {
      io.to(`${socket.id}`).emit("roomJoined", {
        status: "ERROR",
      });
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
