"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";

export type SpaceQuestion = { id: string; label: string; required: boolean };

export function QuestionsEditor({
  questions,
  onChange,
}: {
  questions: SpaceQuestion[];
  onChange: (questions: SpaceQuestion[]) => void;
}) {
  function update(index: number, patch: Partial<SpaceQuestion>) {
    onChange(questions.map((q, i) => (i === index ? { ...q, ...patch } : q)));
  }

  function remove(index: number) {
    onChange(questions.filter((_, i) => i !== index));
  }

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= questions.length) return;
    const next = [...questions];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  }

  function add() {
    onChange([
      ...questions,
      { id: crypto.randomUUID(), label: "", required: false },
    ]);
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Optional questions shown on the collection form to help people write a
        useful testimonial.
      </p>
      {questions.map((q, i) => (
        <div key={q.id} className="flex items-start gap-2 rounded-md border p-3">
          <div className="flex-1 space-y-2">
            <Input
              value={q.label}
              onChange={(e) => update(i, { label: e.target.value })}
              placeholder="e.g. What problem did this solve for you?"
            />
            <div className="flex items-center gap-2">
              <Switch
                checked={q.required}
                onCheckedChange={(checked) => update(i, { required: checked })}
              />
              <span className="text-sm text-muted-foreground">Required</span>
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              disabled={i === 0}
              onClick={() => move(i, -1)}
            >
              <ArrowUp className="size-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              disabled={i === questions.length - 1}
              onClick={() => move(i, 1)}
            >
              <ArrowDown className="size-4" />
            </Button>
            <Button type="button" variant="ghost" size="icon" onClick={() => remove(i)}>
              <Trash2 className="size-4" />
            </Button>
          </div>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={add}>
        <Plus className="size-4" />
        Add question
      </Button>
    </div>
  );
}
