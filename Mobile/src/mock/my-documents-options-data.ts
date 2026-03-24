export interface MyDocumentsUsagePart {
  id: string;
  ratio: number;
  color: string;
  label: string;
}

export interface MyDocumentsActionCard {
  id: string;
  title: string;
  description: string;
  buttonLabel: string;
  buttonVariant: 'blue' | 'gray';
}

export const myDocumentsUsageText = {
  used: '88,4 MB',
  total: '500 MB',
};

export const myDocumentsUsageParts: MyDocumentsUsagePart[] = [
  { id: 'image', ratio: 0.022, color: '#fb923c', label: 'Ảnh' },
  { id: 'video', ratio: 0.009, color: '#86efac', label: 'Video' },
  { id: 'file', ratio: 0.174, color: '#f4d44d', label: 'File' },
  { id: 'other', ratio: 0.01, color: '#9ca3af', label: 'Khác' },
];

export const myDocumentsActionCards: MyDocumentsActionCard[] = [
  {
    id: 'zcloud',
    title: 'Thêm dung lượng với zCloud',
    description: '100 GB dành cho My Documents và toàn bộ dữ liệu trò chuyện',
    buttonLabel: 'Thêm dung lượng',
    buttonVariant: 'blue',
  },
  {
    id: 'cleanup',
    title: 'Dọn dẹp dữ liệu My Documents',
    description: 'Xóa bớt nội dung không cần thiết để có thêm dung lượng trống',
    buttonLabel: 'Xem và dọn dẹp',
    buttonVariant: 'gray',
  },
];

