import React, { useEffect, useRef } from 'react';
import Editor, { type Monaco } from '@monaco-editor/react';

interface MonacoGlslEditorProps {
  code: string;
  onChange: (code: string) => void;
  onCompile?: () => void;
  error?: string | null;
}

export const MonacoGlslEditor: React.FC<MonacoGlslEditorProps> = ({
  code,
  onChange,
  onCompile,
  error,
}) => {
  const editorRef = useRef<any>(null);

  const handleEditorDidMount = (editor: any, monaco: Monaco) => {
    editorRef.current = editor;

    // Register custom GLSL keywords/theme if needed
    monaco.languages.register({ id: 'glsl' });
    monaco.languages.setMonarchTokensProvider('glsl', {
      keywords: [
        'precision', 'highp', 'mediump', 'lowp', 'uniform', 'varying', 'attribute',
        'vec2', 'vec3', 'vec4', 'mat2', 'mat3', 'mat4', 'float', 'int', 'bool',
        'void', 'return', 'if', 'else', 'for', 'while', 'break', 'continue',
        'sin', 'cos', 'tan', 'asin', 'acos', 'atan', 'pow', 'exp', 'log', 'sqrt',
        'abs', 'sign', 'floor', 'ceil', 'fract', 'mod', 'min', 'max', 'clamp',
        'mix', 'step', 'smoothstep', 'length', 'distance', 'dot', 'cross',
        'normalize', 'reflect', 'refract'
      ],
      tokenizer: {
        root: [
          [/[a-zA-Z_]\w*/, {
            cases: {
              '@keywords': 'keyword',
              '@default': 'identifier'
            }
          }],
          [/\/\/.*$/, 'comment'],
          [/\/\*/, 'comment', '@comment'],
          [/\d+\.\d*|\.\d+|\d+/, 'number'],
          [/[{}()\[\]]/, '@brackets'],
          [/[=><!~?:&|+\-*\/\^%]+/, 'operator']
        ],
        comment: [
          [/[^\/*]+/, 'comment'],
          [/\*\//, 'comment', '@pop'],
          [/[\/*]/, 'comment']
        ]
      }
    });

    // Add command for Ctrl/Cmd+S to recompile
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      if (onCompile) onCompile();
    });
  };

  useEffect(() => {
    if (editorRef.current && error) {
      const monaco = (window as any).monaco;
      if (monaco) {
        monaco.editor.setModelMarkers(editorRef.current.getModel(), 'glsl', [
          {
            startLineNumber: 1,
            startColumn: 1,
            endLineNumber: 10,
            endColumn: 1,
            message: error,
            severity: monaco.MarkerSeverity.Error,
          },
        ]);
      }
    }
  }, [error]);

  return (
    <div className="relative w-full h-full flex flex-col bg-[#1e1e1e] border border-slate-800 rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 bg-[#252526] border-b border-neutral-700 text-xs text-neutral-300">
        <div className="flex items-center gap-2">
          <span className="font-mono text-cyan-400">raymarch_scene.glsl</span>
          {error ? (
            <span className="text-[11px] text-red-400 bg-red-950/60 px-2 py-0.5 rounded border border-red-800">
              Shader Error
            </span>
          ) : (
            <span className="text-[11px] text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800">
              Compiled & Live
            </span>
          )}
        </div>
        <div className="text-[11px] text-neutral-400">
          Press <kbd className="px-1 py-0.5 bg-neutral-800 rounded text-neutral-200">Cmd/Ctrl + S</kbd> to compile to Node Graph
        </div>
      </div>

      <div className="flex-1 relative">
        <Editor
          height="100%"
          defaultLanguage="c"
          value={code}
          onChange={(val) => onChange(val || '')}
          onMount={handleEditorDidMount}
          theme="vs-dark"
          options={{
            minimap: { enabled: true, maxColumn: 40 },
            fontSize: 12.5,
            fontFamily: "'JetBrains Mono', 'Fira Code', Menlo, Monaco, monospace",
            lineNumbers: 'on',
            scrollBeyondLastLine: false,
            wordWrap: 'on',
            automaticLayout: true,
            tabSize: 2,
          }}
        />
      </div>

      {error && (
        <div className="p-2.5 bg-red-950/90 text-red-200 text-xs font-mono border-t border-red-800 max-h-24 overflow-y-auto">
          {error}
        </div>
      )}
    </div>
  );
};
