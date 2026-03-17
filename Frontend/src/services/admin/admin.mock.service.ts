const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const simulate = async (message: string) => {
  await wait(300)
  return { message }
}

export const adminMockService = {
  suspendUser: (userId: string) => simulate(`Đã tạm khoá người dùng ${userId}`),
  activateUser: (userId: string) => simulate(`Đã mở lại người dùng ${userId}`),
  verifyUserKyc: (userId: string) => simulate(`Đã xác minh danh tính cho ${userId}`),

  closeConversation: (conversationId: string) => simulate(`Đã khoá hội thoại ${conversationId}`),
  deleteMessage: (messageId: string) => simulate(`Đã xoá tin nhắn ${messageId}`),
  throttleConversation: (conversationId: string) => simulate(`Đã giới hạn tốc độ hội thoại ${conversationId}`),

  muteGroup: (groupId: string) => simulate(`Đã bật chế độ chỉ quản trị viên chat cho nhóm ${groupId}`),
  banGroupMember: (groupId: string, userId: string) => simulate(`Đã chặn ${userId} khỏi nhóm ${groupId}`),

  resolveModerationItem: (itemId: string) => simulate(`Đã xử lý mục kiểm duyệt ${itemId}`),
  rejectModerationItem: (itemId: string) => simulate(`Đã từ chối báo cáo ${itemId}`),

  sendBroadcast: (campaignId: string) => simulate(`Đã gửi chiến dịch ${campaignId}`),
  scheduleBroadcast: (campaignId: string) => simulate(`Đã lên lịch chiến dịch ${campaignId}`),

  resolveSupportTicket: (ticketId: string) => simulate(`Đã đóng ticket ${ticketId}`),
  escalateSupportTicket: (ticketId: string) => simulate(`Đã chuyển mức ưu tiên ticket ${ticketId}`),

  updateSystemSetting: (key: string, value: string) => simulate(`Đã cập nhật ${key} = ${value}`),

  revokeDeviceSession: (userId: string) => simulate(`Đã thu hồi toàn bộ phiên đăng nhập của ${userId}`),
  blockUserCalling: (userId: string) => simulate(`Đã chặn quyền gọi của ${userId}`),
  forceEndCallRoom: (roomId: string) => simulate(`Đã kết thúc cưỡng bức phòng gọi ${roomId}`),
}
