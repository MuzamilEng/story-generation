const goals = { 
  identity: 'Guided by the character and teachings...',
  purpose: 'A lifelong journey...',
  location: '',
  categories: [],
  emotions: '',
  challenges: '',
  dreams: ''
};
const isEmpty = !goals || Object.keys(goals).length === 0 || Object.values(goals).every(v => !v || v === '' || (Array.isArray(v) && v.length === 0));
console.log('Is empty?', isEmpty);
