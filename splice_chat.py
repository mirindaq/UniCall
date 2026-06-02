import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
TARGET = r'Backend/chat-service/src/main/java/iuh/fit/chat_service/services/impl/ConversationServiceImpl.java'
with open(TARGET, 'rb') as f:
    data = f.read()

# Find the unique Vietnamese anchor to locate end of buildTargetSummary method
anchor = b'return targetUserIds.size() + " th\xc3\xa0nh vi\xc3\xaan";'
idx = data.rfind(anchor)
print('Anchor at:', idx, 'of', len(data))
end_anchor = idx + len(anchor)
print('Bytes after anchor:', repr(data[end_anchor:end_anchor+20]))

# Tail is: <anchor>\n }\n}\n
# byte layout after anchor:
#   +0: \n
#   +1: SPACE
#   +2: }
#   +3: \n
#   +4: }
#   +5: \n
# The class-close is the } at offset +4 from end_anchor.
# Insert the new method between the two closing braces.
insert_at = end_anchor + 4  # right before class-close }
print('Insert at:', insert_at)
print('Char at insert_at:', chr(data[insert_at]) if insert_at < len(data) else 'EOF')

method_bytes = (
    b'\n'
    b'    @Override\n'
    b'    public java.util.List<Conversation> getAllGroupsForAdmin() {\n'
    b'        return conversationRepository.findByTypeOrderByDateCreateDesc(ConversationType.GROUP);\n'
    b'    }'
)

new_data = data[:insert_at] + method_bytes + data[insert_at:]
with open(TARGET, 'wb') as f:
    f.write(new_data)
print('Done. New size:', len(new_data))
print()
print('--- Last 130 bytes ---')
print(new_data[-130:].decode('utf-8', errors='replace'))
