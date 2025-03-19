let roomSocket: WebSocket;

export function connectToRoom(roomID: string) {
    roomSocket = new WebSocket(
        "ws://localhost:8080/room/" + roomID + "/connect"
    );

    roomSocket.onmessage = event => {
        console.log("response form server: " + event.data);

        console.log(event);
    };
}

export function sendMessage(message: TypedMessage) {
    console.log(123);

    roomSocket.send(JSON.stringify(message));
}

export interface TypedMessage {
    type: string;
}

// type CreateRoomResponse = {
//     success: boolean;
//     message: string;
// };

// export async function createNewRoom(roomID: string) {
//     const [response, err] = await errorAsValue(
//         fetch("http://localhost:8080/room/create?roomID=" + roomID, {
//             method: "POST",
//         })
//     );
//     if (err) {
//         return;
//     }

//     const [jsonBody, err2] = await errorAsValue<CreateRoomResponse>(
//         response.json()
//     );
//     if (err2) {
//         return;
//     }

//     if (jsonBody.success) {
//         console.log("Room created successfully:", jsonBody.message);
//     } else {
//         console.error("Error creating room:", jsonBody.message);
//     }
// }
