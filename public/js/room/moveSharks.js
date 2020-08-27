//LOCAL VARIABLES
let droppable = null; //format R#C#U - location where selected shark will fall
let previousContainer = null; //where selected shark was prior to current movement
const DROPPABLEWIDTH = 3;
const BORDERCUSHION = 0.2;

//keeps track of shark locations on board
let userBoardArray = createUserBoardArray();

function addSharkEventListeners() {
  const sharks = document.querySelectorAll('.shark-img');
  sharks.forEach((shark) => {
    shark.addEventListener('mousedown', handleSharkClick, true);
  });
}

function removeSharkEventListeners() {
  const sharks = document.querySelectorAll('.shark-img');
  sharks.forEach((shark) => {
    console.log(shark);
    shark.removeEventListener('mousedown', handleSharkClick, true);
    shark.classList.add('disabled');
  });
}

function createUserBoardArray() {
  let userBoardArray = new Array(10);
  for (let row = 0; row < 10; row++) {
    let rowArray = new Array(10);
    for (let col = 0; col < 10; col++) {
      rowArray[col] = '';
    }
    userBoardArray[row] = rowArray;
  }
  return userBoardArray;
}

function getUserBoardArray() {
  return userBoardArray;
}

//STRATEGY
//Single click rotates shark
//Drag moves shark to new location
//Drag off board moves shark to tank
//To differentiate between a click and a drag, add an event listener for both, and then remove them both once one has occured

//called by HTML - starts shark move - add event listeners for both single click and drag
function handleSharkClick(event) {
  console.log('sharkclick');
  let element = event.target;
  previousContainer = element.parentNode;
  document.addEventListener(
    'mousemove',
    (dnd = () => dragAndDropShark(element, event))
  );

  document.addEventListener(
    'mouseup',
    (rot = () => rotateShark(element, event))
  );
}

//clear mouse event listeners after a mousedown has been identified as a click or drag
function cleanEventListeners() {
  document.removeEventListener('mouseup', rot);
  document.removeEventListener('mousemove', dnd);
}

//drag and drop shark
//https://javascript.info/mouse-drag-and-drop
//https://plnkr.co/edit/KxqImMT4P0ySjN97?p=preview&preview
function dragAndDropShark(element, event) {
  cleanEventListeners();

  //disable default browser drag and drop
  element.ondragstart = function () {
    return false;
  };

  //set shark's tank and start location (where shark goes if not dropped on board)
  const tank = document.querySelector(`#${element.id}tank`);

  //move shark to front of global document
  element.style.position = 'absolute';
  element.style.zIndex = 1000;
  document.body.appendChild(element);

  //find middle of shark
  let { shiftX, shiftY } = getShift(element);

  //function to move with mouse
  const moveAt = (pageX, pageY) => {
    element.style.left = pageX - shiftX + 'px';
    element.style.top = pageY - shiftY + 'px';
  };

  //center shark under mouse
  moveAt(event.pageX, event.pageY);

  //move shark with mouse and set droppable if hovering over droppable element
  const onMouseMove = (event) => {
    moveAt(event.pageX, event.pageY);

    //move to back of page so we can get element below
    element.style.zIndex = -1000;
    let elementBelow = document.elementFromPoint(event.clientX, event.clientY);
    element.style.zIndex = 1000;

    if (!elementBelow) {
      droppable = null;
      return;
    }
    if (elementBelow.classList.contains('droppable')) {
      droppable = elementBelow;
    } else if (elementBelow.classList.contains('shark-img')) {
      droppable = previousContainer;
    } else {
      droppable = null;
    }
  };

  document.addEventListener('mousemove', onMouseMove);

  //set shark location when mouse is released
  const onMouseUp = () => {
    document.removeEventListener('mousemove', onMouseMove);

    //put shark in tank if not over gameboard
    if (droppable === null || droppable.classList.contains('shark-tank')) {
      element.style = '';
      element.classList.remove('rotated');
      putElementInContainer(element, tank);
      cleanLocations();
    } else {
      // getDesiredElementLocation(element);
      const isAvailable = adjustLocationForEdgesAndVerifyAvailable(
        element,
        false
      );
      if (!isAvailable) {
        putElementInContainer(element, previousContainer);
        document.removeEventListener('mouseup', onMouseUp);
        cleanLocations();
        return;
      }
      updateBoard(element);
    }
    document.removeEventListener('mouseup', onMouseUp);
  };

  document.addEventListener('mouseup', onMouseUp);
}

//toggle between vertical and horizontal
function rotateShark(element, event) {
  cleanEventListeners();

  //set droppable
  element.style.zIndex = -1000;
  let elementBelow = document.elementFromPoint(event.clientX, event.clientY);
  element.style.zIndex = 1000;
  if (!elementBelow.classList.contains('droppable')) return;
  droppable = elementBelow;

  //shift shark if hits edge and verify proposed location works
  const isAvailable = adjustLocationForEdgesAndVerifyAvailable(element, true);
  if (!isAvailable) {
    putElementInContainer(element, previousContainer);
    cleanLocations();
    return;
  }

  updateBoard(element);
}

//determine how far to shift element when it is dragged
function getShift(element) {
  let isVert = element.classList.contains('rotated');
  let width = +element.id[5];
  let evenOffset =
    width % 2 === 0 ? (isVert ? 0 : (width / 2 - 0.5) / width) : 0.5;
  let shiftX, shiftY;
  if (!element.classList.contains('rotated')) {
    shiftX = element.offsetWidth * evenOffset;
    shiftY = element.offsetHeight / 2;
  } else {
    shiftX = element.offsetWidth / 2;
    shiftY = element.offsetHeight * evenOffset;
  }

  return { shiftX, shiftY };
}

//determine location of place element will be dropped
function getDroppablePosition(location) {
  let posX =
    location.getBoundingClientRect().left / 2 +
    location.getBoundingClientRect().right / 2;
  let posY =
    location.getBoundingClientRect().top / 2 +
    location.getBoundingClientRect().bottom / 2;

  return { posX, posY };
}

//clear data
function cleanLocations() {
  droppable = null;
  previousContainer = null;
}

function adjustLocationForEdgesAndVerifyAvailable(element, isRotation) {
  //get shark size, rotation, and dropped location
  let width = +element.id[5];
  let label = element.id.slice(5);
  let isVert = isRotation
    ? !element.classList.contains('rotated')
    : element.classList.contains('rotated');
  let row = droppable.id[1];
  let col = droppable.id[3];

  //get board limits
  let buffer = Math.floor(width / 2);
  let minRow = isVert ? buffer : 0;
  let maxRow = isVert ? 9 - buffer : 9;
  let minCol = isVert ? 0 : buffer;
  let maxCol = isVert ? 9 : 9 - buffer;

  //adjust for members whose center falls between buttons
  if (width % 2 == 0) {
    minRow--;
    minCol--;
  }

  //set row and column inside limits
  if (row < minRow) row = minRow;
  else if (row > maxRow) row = maxRow;
  else if (col < minCol) col = minCol;
  else if (col > maxCol) col = maxCol;

  //check if new location is available - if not, alert user but move nothing
  let offset = Math.floor((width - 1) / 2);
  let currRow = isVert ? row - offset : row;
  let currCol = isVert ? col : col - offset;

  let isAvailable = true;
  if (isVert) {
    for (i = 0; i < width; i++) {
      if (
        !(userBoardArray[currRow + i][currCol] === '') &&
        !(userBoardArray[currRow + i][currCol] === label)
      ) {
        isAvailable = false;
        break;
      }
    }
  } else {
    for (i = 0; i < width; i++) {
      if (
        !(userBoardArray[currRow][currCol + i] === '') &&
        !(userBoardArray[currRow][currCol + i] === label)
      ) {
        isAvailable = false;
        break;
      }
    }
  }

  if (!isAvailable) return false;

  //rotate shark
  if (isRotation) {
    if (element.classList.contains('rotated')) {
      element.classList.remove('rotated');
    } else {
      element.classList.add('rotated');
    }
  }

  //set droppable and append element
  const location = document.getElementById('R' + row + 'C' + col + 'U');

  droppable = location;
  putElementInContainer(element, droppable);

  return true;
}

function removeElementFromBoard(element) {
  let label = element.id.slice(5);
  for (i = 0; i < 10; i++) {
    for (j = 0; j < 10; j++) {
      userBoardArray[i][j] === label && (userBoardArray[i][j] = '');
    }
  }
}

function putElementInContainer(element, location) {
  let width = +element.id[5];
  let isVert = element.classList.contains('rotated');
  location.appendChild(element);

  if (location.classList.contains('shark-tank')) {
    removeElementFromBoard(element);
    element.style = '';
    return;
  }

  //move shark relative to droppable
  element.style.position = 'relative';
  let shiftX = (width * DROPPABLEWIDTH - BORDERCUSHION) / 2;
  if (width % 2 == 0) {
    element.style.left = isVert
      ? DROPPABLEWIDTH / 2 - shiftX + 'vw'
      : DROPPABLEWIDTH - shiftX + 'vw';
    element.style.top = isVert ? 0 + DROPPABLEWIDTH / 2 + 'vw' : 0;
  } else {
    element.style.left = DROPPABLEWIDTH / 2 - shiftX + 'vw';
    element.style.top = 0;
  }

  checkSharkTank();
}

function putSharkInTank(id) {
  let tank = document.getElementById('shark' + id + 'tank');
  let shark = document.getElementById('shark' + id);
  tank.appendChild(shark);
  shark.removeAttribute('style');
  shark.classList.remove('disabled', 'rotated');
  shark.addEventListener('mousedown', (e) => handleSharkClick(e));
}

//see if all sharks out of tank (and presumable on board - modify in future)
function checkSharkTank() {
  let sharksInTanks = 0;
  for (i = 0; i < 5; i++) {
    sharksInTanks += tankContainer.children[i].children.length;
  }
  if (sharksInTanks === 0) {
    userLockButton.classList.add('unhide');
  }
}

//update board array - keeps track of shark locations
const updateBoard = (element) => {
  let width = +element.id[5];
  let label = element.id.slice(5);
  let isVert = element.classList.contains('rotated');
  let row = droppable.id[1];
  let col = droppable.id[3];

  let offset = Math.floor((width - 1) / 2);
  let currRow = isVert ? row - offset : row;
  let currCol = isVert ? col : col - offset;

  removeElementFromBoard(element);

  if (isVert) {
    for (i = 0; i < width; i++) {
      userBoardArray[currRow + i][currCol] = label;
    }
  } else {
    for (i = 0; i < width; i++) {
      userBoardArray[currRow][currCol + i] = label;
    }
  }

  cleanLocations();
};

//#endregion
