// unique id generator by generator function

function* idGenerator() {
  let id = 1;
  while (true) {
    yield id++;
  }
}

const UNIQUE_ID = idGenerator();

export default UNIQUE_ID;
