function printLocalDate(dateString) {
  const date = new Date(dateString);
  if (isNaN(date)) {
    console.error('Invalid date format!');

    return;
  }
  
  return date.toLocaleDateString();
}