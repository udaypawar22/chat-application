export default function Avatar({ online, username, userId }) {
  const colors = [
    "bg-red-200",
    "bg-green-200",
    "bg-purple-200",
    "bg-blue-200",
    "bg-yellow-200",
    "bg-teal-200",
  ];
  const userIdBase16 = parseInt(userId, 16);
  const colorIndex = userIdBase16 % colors.length;
  const color = colors[colorIndex];
  return (
    <div
      className={"relative w-10 h-10 rounded-full flex items-center " + color}
    >
      <div className="text-center w-full opacity-70">{username[0]}</div>
      {online && (
        <div className="absolute w-3 h-3 bg-green-600 bottom-0 right-0 rounded-full border border-white"></div>
      )}
    </div>
  );
}
