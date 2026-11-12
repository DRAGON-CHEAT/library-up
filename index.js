import file1 from './library/categories.json';
import file2 from './library/games.json';

export default {
  async fetch(request) {
    const url = new URL(request.url);


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

    return new Response('/library ', { status: 200 });
  }
};
