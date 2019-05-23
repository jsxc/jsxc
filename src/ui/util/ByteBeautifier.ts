export default function format(byte: number) {
   let s = ['', 'KB', 'MB', 'GB', 'TB'];
   let i;

   for (i = 1; i < s.length; i++) {
      if (byte < 1024) {
         break;
      }
      byte /= 1024;
   }

   return (Math.round(byte * 10) / 10) + s[i - 1];
}
