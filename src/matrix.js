class MatrixServer {

    constructor(homeserver, roomID, token) {
        this.homeserver = homeserver;
        this.roomID = roomID;
        this.token = token;
    }

    async sendMatrixNotification (messageContent) {
        console.log(`Sending Matrix notification (length: ${messageContent.length})`);
        if (!this.token || !this.roomID) {
            console.error('Missing Matrix config, cannot send notification');
            return null;
        }
        const txnId = new Date().getTime() + '_' + Math.random().toString(36).substring(2, 9);
        const url = `${this.homeserver}/_matrix/client/v3/rooms/${encodeURIComponent(this.roomID)}/send/m.room.message/${txnId}`;

        try {
            const response = await fetch(url, {
                method: 'PUT',
                body: JSON.stringify({
                    body: messageContent,
                    format: "org.matrix.custom.html",
                    formatted_body: messageContent,
                    msgtype: "m.text"
                }),
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            console.log(`Matrix event sent: ${data.event_id}`);
            return data.event_id;
        } catch (error) {
            console.error('Failed to send Matrix notification:', error.message);
            return null;
        }
    }

    async getNextBatch(timeout = 0, since = null) {
        let url = `${this.homeserver}/_matrix/client/v3/sync?timeout=${timeout}`
        if (since !== null) {
            url += `&since=${since}`
        }
        const res = await fetch(url, {
            headers: { 'Authorization': `Bearer ${this.token}` }
        });

        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        const data = await res.json();
        return data;
    }

    async sendReaction(matrixEventId) {
         const reactionTxnId = new Date().getTime() + '_react_' + Math.random().toString(36).substring(2, 9);
            try {
                const reactRes = await fetch(`${this.homeserver}/_matrix/client/v3/rooms/${encodeURIComponent(this.roomID)}/send/m.reaction/${reactionTxnId}`, {
                    method: 'PUT',
                    body: JSON.stringify({
                        "m.relates_to": {
                            "rel_type": "m.annotation",
                            "event_id": matrixEventId,
                            "key": "☑️"
                        }
                    }),
                    headers: {
                        'Authorization': `Bearer ${this.token}`,
                        'Content-Type': 'application/json'
                    }
                });
                if (!reactRes.ok) {
                    throw new Error(`HTTP error! status: ${reactRes.status}`);
                }
            } catch (reactErr) {
                console.error('Failed to send confirmation reaction:', reactErr.message);
            }
    }
    async listJoinedRooms() {

        console.log('Fetching joined rooms...');
        try {
            const res = await fetch(`${this.homeserver}/_matrix/client/v3/joined_rooms`, {
                headers: { 'Authorization': `Bearer ${this.token}` }
            });
            if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
            const data = await res.json();

            const rooms = data.joined_rooms || [];
            console.log(`Joined to ${rooms.length} rooms:`);

            for (const roomId of rooms) {
                let name = '';
                try {
                    const nameRes = await fetch(`${this.homeserver}/_matrix/client/v3/rooms/${encodeURIComponent(roomId)}/state/m.room.name`, {
                        headers: { 'Authorization': `Bearer ${this.token}` }
                    });
                    if (nameRes.ok) {
                        const nameData = await nameRes.json();
                        name = nameData.name;
                    }
                } catch (err) {
                    // Ignore errors fetching name (e.g. 404 if not set)
                }
                console.log(`- ${roomId}${name ? ` (${name})` : ''}`);
            }
        } catch (error) {
            console.error('Failed to fetch joined rooms:', error.message);
        }
    }
}

export { MatrixServer };