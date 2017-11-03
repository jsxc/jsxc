export default function format(byte: number) {
   var s = ['', 'KB', 'MB', 'GB', 'TB'];
   var i;

   for (i = 1; i < s.length; i++) {
      if (byte < 1024) {
         break;
      }
      byte /= 1024;
   }

   return (Math.round(byte * 10) / 10) + s[i - 1];
}
