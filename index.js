import file1 from './library/categories.json';
import file2 from './library/games.json';

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const acceptHeader = request.headers.get('Accept') || '';

    // إذا فتح شخص الرابط من متصفح ويب، اعرض له صفحة بيضاء فارغة ممنوع فيها التحديد
    if (acceptHeader.includes('text/html')) {
      const blankPage = `<!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body {
            background-color: #ffffff;
            margin: 0;
            user-select: none;
            -webkit-user-select: none;
            -moz-user-select: none;
          }
        </style>
      </head>
      <body oncontextmenu="return false;"></body>
      </html>`;

      return new Response(blankPage, {
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
      });
    }

    // إذا كان الطلب من تطبيق أو كود برمجي، أرسل بيانات JSON كالمعتاد
    if (url.pathname === '/library' || url.pathname === '/library/') {
      const combinedData = {
        firstFile: file1,
        secondFile: file2
      };

      return new Response(JSON.stringify(combinedData, null, 2), {
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    return new Response('', { status: 404 });
  }
};
