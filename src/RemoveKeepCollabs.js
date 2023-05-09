import { WebSocketNetwork } from "@collabs/ws-client";
import { ListItemIcon, ListItemText, Menu, MenuItem } from "@mui/material";
import React, { useMemo, useState } from "react";
import "./App.css";
import { SpreadsheetDoc } from "./CSpreadsheet";

/** Returns a saved doc with the initial state. */
function saveInitialDoc() {
  const iDoc = new SpreadsheetDoc({ debugReplicaID: "INIT" });
  // Make 4 rows (incl header) and 3 columns.
  for (let i = 0; i < 4; i++) {
    iDoc.spreadsheet.insert_row(i);
  }
  for (let i = 0; i < 3; i++) {
    iDoc.spreadsheet.insert_column(i);
  }
  // Set header row.
  for (let i = 0; i < 3; i++) {
    iDoc.spreadsheet.edit_cell(0, i, "XYZ");
  }
  return iDoc.save();
}

const cDoc = new SpreadsheetDoc();
cDoc.load(saveInitialDoc());
const wsProvider = new WebSocketNetwork(
  cDoc,
  "ws://localhost:1235",
  "removeKeep"
);

function RemoveKeepCollabs() {
  // Initialization of the JSX display.
  const initialState = useMemo(() => cDoc.spreadsheet.cells(), [cDoc]);
  const [spreadsheet, setSpreadsheet] = useState(initialState.slice(1));

  const [headers, setHeaders] = useState(initialState[0]);

  const [connectionStatus, setConnectionStatus] = useState("");

  // Rebuild the spreadsheet when it change (Any event), waiting until
  // the next cDoc.Change event (batching).
  let pending = false;
  cDoc.spreadsheet.on("Any", () => {
    if (!pending) {
      pending = true;
      cDoc.on("Change", () => {
        pending = false;
        rebuildSpreadsheet();
      });
    }
  });

  function rebuildSpreadsheet() {
    const cells = cDoc.spreadsheet.cells();
    setHeaders(cells[0]);
    setSpreadsheet(cells.slice(1));
  }

  // Context menu context for the column and row context menus, respectively
  const columnContextMenuItems = [
    {
      text: "Insert left",
      image: "https://cdn-icons-png.flaticon.com/512/7601/7601881.png",
    },
    {
      text: "Delete column",
      image: "https://cdn-icons-png.flaticon.com/512/7794/7794583.png",
    },
    {
      text: "Insert right",
      image: "https://cdn-icons-png.flaticon.com/512/7601/7601880.png",
    },
  ];

  const rowContextMenuItems = [
    {
      text: "Insert above",
      image: "https://cdn-icons-png.flaticon.com/512/6535/6535072.png",
    },
    {
      text: "Delete row",
      image: "https://cdn-icons-png.flaticon.com/512/1/1813.png",
    },
    {
      text: "Insert below",
      image: "https://cdn-icons-png.flaticon.com/512/6535/6535075.png",
    },
  ];

  // Action handlers for spreadsheet manipulation
  // - Header rename handler
  const handleHeaderChange = (colIndex, value) => {
    spreadsheet.edit_cell(0, colIndex, value);
    const newHeaders = [...headers];
    newHeaders[colIndex] = value;
    setHeaders(newHeaders);
  };

  const handleHeaderBlur = (colIndex, value) => {
    // TODO: only set if non-redundant, like original (but keep regardless)?
    cDoc.spreadsheet.edit_cell(0, colIndex, value);
  };

  // - Row & column insertion
  const handleInsertRow = (index) => {
    cDoc.spreadsheet.insert_row(index);
  };

  const handleInsertCol = (index) => {
    cDoc.spreadsheet.insert_column(index);
  };

  // - Row & column removal
  const handleRemoveRow = (index) => {
    cDoc.spreadsheet.remove_row(index);
  };

  const handleRemoveCol = (index) => {
    cDoc.spreadsheet.remove_column(index);
  };

  // - Cell change
  const handleCellChange = (rowIndex, cellIndex, value) => {
    const newSpreadsheet = [...spreadsheet];
    newSpreadsheet[rowIndex][cellIndex] = value;
    setSpreadsheet(newSpreadsheet);
  };

  const handleCellBlur = (rowIndex, colIndex, value) => {
    cDoc.spreadsheet.edit_cell(rowIndex, colIndex, value);
  };

  // - Context menu selections
  function handleColumnContextMenuClick(index) {
    switch (index) {
      case 0:
      case 2:
        handleInsertCol(columnOpenIndex + index / 2);
        break;
      case 1:
        handleRemoveCol(columnOpenIndex);
        break;
      default:
        return console.log(
          `handleColumnContextMenuClick called with index out of bound: ${index}`
        );
    }
  }

  function handleRowContextMenuClick(index) {
    switch (index) {
      case 0:
      case 2:
        handleInsertRow(rowOpenIndex + index / 2);
        break;
      case 1:
        handleRemoveRow(rowOpenIndex);
        break;
      default:
        return console.log(
          `handleColumnContextMenuClick called with index out of bound: ${index}`
        );
    }
  }

  // Conversion function of index to alphabet
  function getColumnIndicator(colIndex) {
    return String.fromCharCode(colIndex + 65);
  }

  // States used for keeping track of context menu states
  const [columnOpen, setColumnOpen] = useState(false);
  const [rowOpen, setRowOpen] = useState(false);
  const [anchorColumnEl, setAnchorColumnEl] = useState(null);
  const [anchorRowEl, setAnchorRowEl] = useState(null);
  const [columnOpenIndex, setColumnOpenIndex] = useState(null);
  const [rowOpenIndex, setRowOpenIndex] = useState(null);

  // Context menu handlers for rows and columns, respectively, including closeHandlers
  const handleRowHeaderContextMenu = (event, index) => {
    event.preventDefault();
    setAnchorRowEl(event.currentTarget);
    setRowOpen(true);
    setRowOpenIndex(index);
  };

  const handleColumnHeaderContextMenu = (event, index) => {
    event.preventDefault();
    setAnchorColumnEl(event.currentTarget);
    setColumnOpen(true);
    setColumnOpenIndex(index);
  };

  const handleColumnClose = () => {
    setColumnOpen(false);
  };

  const handleRowClose = () => {
    setRowOpen(false);
  };

  // Main spreadsheet construction
  return (
    <div className="split">
      <table id="spreadsheetSim">
        <thead>
          <tr className="firstRow">
            <th title="Right click for options">
              <img
                alt="MR"
                height="16em"
                src="https://cdn-icons-png.flaticon.com/512/3645/3645851.png"
              />
            </th>
            {headers.map((col, colIndex) => (
              <th
                key={colIndex}
                onContextMenu={(event) =>
                  handleColumnHeaderContextMenu(event, colIndex)
                }
              >
                {getColumnIndicator(colIndex)}
              </th>
            ))}
            <th
              key="button"
              className="addButtons addColumnButton"
              rowSpan={2}
              onClick={() => handleInsertCol(cDoc.spreadsheet.colLength())}
            >
              +
            </th>
          </tr>
          <tr>
            <th />
            {headers.map((col, colIndex) => (
              <th key={colIndex}>
                <input
                  type="text"
                  value={col}
                  onChange={(event) =>
                    handleHeaderChange(colIndex, event.target.value)
                  }
                  onBlur={(event) =>
                    handleHeaderBlur(colIndex, event.target.value)
                  }
                />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {spreadsheet.map((row, rowIndex) => (
            <tr key={rowIndex}>
              <th
                onContextMenu={(event) =>
                  handleRowHeaderContextMenu(event, rowIndex)
                }
              >
                {rowIndex + 1}
              </th>
              {row.map((cell, cellIndex) => (
                <td key={cellIndex}>
                  <input
                    type="text"
                    value={cell || ""}
                    onChange={(event) =>
                      handleCellChange(rowIndex, cellIndex, event.target.value)
                    }
                    onBlur={(event) =>
                      handleCellBlur(rowIndex, cellIndex, event.target.value)
                    }
                  />
                </td>
              ))}
            </tr>
          ))}

          <tr>
            <th
              className="addButtons addRowButton"
              onClick={() => handleInsertRow(cDoc.spreadsheet.rowLength())}
            >
              +
            </th>
          </tr>
        </tbody>
        <Menu
          id="columnContextMenu"
          anchorEl={anchorColumnEl}
          open={columnOpen}
          onClose={handleColumnClose}
          onClick={handleColumnClose}
        >
          {columnContextMenuItems.map((element, index) => (
            <MenuItem
              key={element.text}
              onClick={() => handleColumnContextMenuClick(index)}
            >
              <ListItemIcon>
                <img height="16em" src={element.image} alt={element.text} />
              </ListItemIcon>
              <ListItemText primary={element.text} />
            </MenuItem>
          ))}
        </Menu>
        <Menu
          id="rowContextMenu"
          anchorEl={anchorRowEl}
          open={rowOpen}
          onClose={handleRowClose}
          onClick={handleRowClose}
        >
          {rowContextMenuItems.map((element, index) => (
            <MenuItem
              key={element.text}
              onClick={() => handleRowContextMenuClick(index)}
            >
              <ListItemIcon>
                <img height="16em" src={element.image} alt={element.text} />
              </ListItemIcon>
              <ListItemText primary={element.text} />
            </MenuItem>
          ))}
        </Menu>
      </table>
      WebSocket:
      <div className="wsStatus">
        {wsProvider.wsconnecting ? (
          <span title="Connecting">
            <img
              alt={connectionStatus}
              height="16em"
              src="https://cdn-icons-png.flaticon.com/512/3031/3031712.png"
            />{" "}
            Connecting to websocket...
          </span>
        ) : wsProvider.wsconnected ? (
          <span title="Connected">
            <img
              alt={connectionStatus}
              height="16em"
              src="https://cdn-icons-png.flaticon.com/512/2983/2983692.png"
            />{" "}
            <button onClick={() => wsProvider.disconnect()}>Disconnect</button>
          </span>
        ) : (
          <span title="Disonnected">
            <img
              alt={connectionStatus}
              height="16em"
              src="https://cdn-icons-png.flaticon.com/512/1144/1144833.png"
            />{" "}
            <button onClick={() => wsProvider.connect()}>Reconnect</button>
          </span>
        )}
      </div>
      {/* TODO */}
      {/* yDoc: <br />
      <tt className="json">
        <div>
          <b>Spreadsheet & Labels (yMap): </b>
          <br />
          {JSON.stringify(yMap.toJSON(), null, "  ")}
        </div>
        <div>
          <b>Columns (yArray): </b>
          <br />
          {JSON.stringify(yColumns.toJSON(), null, "  ")}
        </div>
        <div>
          <b>Rows (yArray): </b>
          <br />
          {JSON.stringify(yRows.toJSON(), null, "  ")}
        </div>
        <div>
          <b>Keep Columns (yMap): </b>
          <br />
          {JSON.stringify(yColKeep.toJSON(), null, "  ")}
        </div>
        <div>
          <b>Keep Rows (yMap): </b>
          <br />
          {JSON.stringify(yRowKeep.toJSON(), null, "  ")}
        </div>
      </tt> */}
    </div>
  );
}

export default RemoveKeepCollabs;
