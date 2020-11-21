import process from "process";

function readAll(readable) {
  return new Promise((resolve) => {
    const chunks = [];

    readable.on("readable", () => {
      let chunk;
      while (null !== (chunk = readable.read())) {
        chunks.push(chunk);
      }
    });

    readable.on("end", () => {
      const content = chunks.join("");
      resolve(content);
    });
  });
}

console.log(await readAll(process.stdin));
