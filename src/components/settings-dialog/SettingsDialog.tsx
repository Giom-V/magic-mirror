/**
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
} from "@mui/material";
import {
  FunctionDeclaration,
  FunctionDeclarationsTool,
  Part,
} from "@google/generative-ai";
import { useEffect, useMemo, useState } from "react";
import { UseLiveAPIResults } from "../../hooks/use-live-api";

type SettingsDialogProps = {
  open: boolean;
  onClose: () => void;
  useLiveAPI: UseLiveAPIResults;
};

export default function SettingsDialog({
  open,
  onClose,
  useLiveAPI,
}: SettingsDialogProps) {
  const { config, setConfig, model, setModel } = useLiveAPI;

  const [systemInstruction, setSystemInstruction] = useState("");
  const [tools, setTools] = useState<any[]>([]);

  useEffect(() => {
    setSystemInstruction(getSystemInstruction(config));
  }, [config.systemInstruction]);

  useEffect(() => {
    if (config.tools) {
      const stringifiedTools = config.tools?.map((tool: any) => {
        const fdTool = tool as FunctionDeclarationsTool;
        if (!fdTool.functionDeclarations) {
          return tool;
        }
        return {
          functionDeclarations: fdTool.functionDeclarations.map((f: any) => ({
            ...f,
            parameters: JSON.stringify(f.parameters, null, 2),
          })),
        };
      });
      setTools(stringifiedTools);
    }
  }, [config.tools]);

  const handleSystemInstructionChange = (
    e: React.ChangeEvent<HTMLTextAreaElement>,
  ) => {
    setSystemInstruction(e.target.value);
  };

  const handleToolChange = (index: number, newTool: FunctionDeclaration) => {
    const newTools = [...tools];
    const toolToUpdate = newTools[index] as {
      functionDeclarations: FunctionDeclaration[];
    };
    toolToUpdate.functionDeclarations = [newTool];
    setTools(newTools);
  };

  const handleSave = () => {
    setConfig({
      ...config,
      systemInstruction: { parts: [{ text: systemInstruction }] },
      tools: tools.map((tool) => {
        const fdTool = tool as FunctionDeclarationsTool;
        if (!Array.isArray(fdTool.functionDeclarations)) {
          return tool;
        }
        return {
          functionDeclarations: fdTool.functionDeclarations.map((f: any) => ({
            ...f,
            parameters: JSON.parse(f.parameters),
          })),
        };
      }),
    });
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>Settings</DialogTitle>
      <DialogContent>
        <TextField
          label="Model"
          value={model}
          onChange={(e) => setModel(e.target.value)}
          fullWidth
          margin="normal"
        />
        <TextField
          label="System Instruction"
          multiline
          rows={4}
          value={systemInstruction}
          onChange={handleSystemInstructionChange}
          fullWidth
          margin="normal"
        />
        <h3>Tools</h3>
        {tools?.map((tool, index) => {
          if (tool.functionDeclarations) {
            return tool.functionDeclarations.map(
              (fd: any, fdIndex: number) => (
                <div key={fdIndex}>
                  <TextField
                    label="Name"
                    value={fd.name}
                    onChange={(e) => {
                      const newTool = { ...fd, name: e.target.value };
                      handleToolChange(index, newTool);
                    }}
                    fullWidth
                    margin="normal"
                  />
                  <TextField
                    label="Description"
                    value={fd.description}
                    onChange={(e) => {
                      const newTool = { ...fd, description: e.target.value };
                      handleToolChange(index, newTool);
                    }}
                    fullWidth
                    margin="normal"
                  />
                  <TextField
                    label="Parameters"
                    multiline
                    rows={4}
                    value={fd.parameters}
                    onChange={(e) => {
                      const newTool = { ...fd, parameters: e.target.value };
                      handleToolChange(index, newTool);
                    }}
                    fullWidth
                    margin="normal"
                  />
                </div>
              ),
            );
          }
          return null;
        })}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave}>Save</Button>
      </DialogActions>
    </Dialog>
  );
}

function getSystemInstruction(config: any) {
  if (typeof config.systemInstruction === "string") {
    return config.systemInstruction;
  }
  if (config.systemInstruction) {
    return (
      config.systemInstruction.parts?.map((p: Part) => p.text).join("\n") || ""
    );
  }
  return "";
}
