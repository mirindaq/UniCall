import type { ChatCallInfo, ChatMessageResponse } from '@/types/chat';

export type CallMessageCardTone = 'danger' | 'neutral' | 'success';

export type CallMessageCard = {
  title: string;
  subtitle: string;
  tone: CallMessageCardTone;
};

const formatCallDuration = (seconds?: number) => {
  if (!seconds || seconds <= 0) {
    return '0 phút 0 giây';
  }
  const minute = Math.floor(seconds / 60);
  const second = seconds % 60;
  return `${minute} phút ${second} giây`;
};

export const buildCallMessageCard = (
  callInfo: ChatCallInfo | undefined,
  currentUserId: string | null,
): CallMessageCard => {
  if (!callInfo || !currentUserId) {
    return {
      title: 'Cuộc gọi',
      subtitle: 'Gọi lại',
      tone: 'neutral',
    };
  }

  const callKind = callInfo.audioOnly ? 'thoại' : 'video';
  const isCaller = callInfo.callerUserId === currentUserId;

  if (callInfo.outcome === 'COMPLETED') {
    return {
      title: isCaller ? `Cuộc gọi ${callKind} đi` : `Cuộc gọi ${callKind} đến`,
      subtitle: formatCallDuration(callInfo.durationSeconds),
      tone: 'success',
    };
  }
  if (callInfo.outcome === 'NO_ANSWER') {
    return {
      title: isCaller ? 'Bạn đã hủy' : 'Bạn bị nhỡ',
      subtitle: `Cuộc gọi ${callKind}`,
      tone: 'danger',
    };
  }
  if (callInfo.outcome === 'REJECTED') {
    return {
      title: isCaller ? 'Cuộc gọi bị từ chối' : 'Bạn đã từ chối',
      subtitle: `Cuộc gọi ${callKind}`,
      tone: 'danger',
    };
  }
  return {
    title: 'Cuộc gọi đã kết thúc',
    subtitle: `Cuộc gọi ${callKind}`,
    tone: 'neutral',
  };
};

export const buildCallMessageCardFromMessage = (
  message: Pick<ChatMessageResponse, 'callInfo'>,
  currentUserId: string | null,
): CallMessageCard | null => {
  if (!message.callInfo) {
    return null;
  }
  return buildCallMessageCard(message.callInfo, currentUserId);
};
