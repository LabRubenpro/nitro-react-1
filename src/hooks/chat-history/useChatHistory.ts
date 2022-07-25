import { GetGuestRoomResultEvent, RoomSessionChatEvent, RoomSessionEvent } from '@nitrots/nitro-renderer';
import { useState } from 'react';
import { useBetween } from 'use-between';
import { ChatEntryType, ChatHistoryCurrentDate, GetRoomSession, IChatEntry, IRoomHistoryEntry } from '../../api';
import { useMessageEvent, useRoomSessionManagerEvent } from '../events';

const CHAT_HISTORY_MAX = 1000;
const ROOM_HISTORY_MAX = 10;

let CHAT_HISTORY_COUNTER: number = 0;

const useChatHistoryState = () =>
{
    const [ chatHistory, setChatHistory ] = useState<IChatEntry[]>([]);
    const [ roomHistory, setRoomHistory ] = useState<IRoomHistoryEntry[]>([]);
    const [ needsRoomInsert, setNeedsRoomInsert ] = useState(false);

    const addChatEntry = (entry: IChatEntry) =>
    {
        entry.id = CHAT_HISTORY_COUNTER++;

        setChatHistory(prevValue =>
        {
            const newValue = [ ...prevValue ];

            newValue.push(entry);

            if(newValue.length > CHAT_HISTORY_MAX) newValue.shift();

            return newValue;
        });
    }

    const addRoomHistoryEntry = (entry: IRoomHistoryEntry) =>
    {
        setRoomHistory(prevValue =>
        {
            const newValue = [ ...prevValue ];

            newValue.push(entry);

            if(newValue.length > ROOM_HISTORY_MAX) newValue.shift();

            return newValue;
        });
    }
    
    useRoomSessionManagerEvent<RoomSessionChatEvent>(RoomSessionChatEvent.CHAT_EVENT, event =>
    {
        const roomSession = GetRoomSession();

        if(!roomSession) return;

        const userData = roomSession.userDataManager.getUserDataByIndex(event.objectId);

        if(!userData) return;

        addChatEntry({ id: -1, entityId: userData.webID, name: userData.name, look: userData.figure, entityType: userData.type, message: event.message, timestamp: ChatHistoryCurrentDate(), type: ChatEntryType.TYPE_CHAT, roomId: roomSession.roomId });
    });

    useRoomSessionManagerEvent<RoomSessionEvent>(RoomSessionEvent.STARTED, event => setNeedsRoomInsert(true));

    useMessageEvent<GetGuestRoomResultEvent>(GetGuestRoomResultEvent, event =>
    {
        if(!needsRoomInsert) return;

        const parser = event.getParser();

        if(roomHistory.length)
        {
            if(roomHistory[(roomHistory.length - 1)].id === parser.data.roomId) return;
        }

        addChatEntry({ id: -1, entityId: parser.data.roomId, name: parser.data.roomName, timestamp: ChatHistoryCurrentDate(), type: ChatEntryType.TYPE_ROOM_INFO, roomId: parser.data.roomId });

        addRoomHistoryEntry({ id: parser.data.roomId, name: parser.data.roomName });

        setNeedsRoomInsert(false);
    });

    return { chatHistory, roomHistory };
}

export const useChatHistory = () => useBetween(useChatHistoryState);
