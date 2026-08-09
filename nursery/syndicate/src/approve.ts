export type EditPrompt = (label: string, initialValue: string) => Promise<string>;

export async function approveCaption(
  editPrompt: EditPrompt,
  platform: string,
  draftText: string,
): Promise<string> {
  return editPrompt(`Review/edit the ${platform} caption (Enter to accept as-is):`, draftText);
}

export function createInquirerEditPrompt(): EditPrompt {
  return async (label, initialValue) => {
    const { input } = await import('@inquirer/prompts');
    return input({ message: label, default: initialValue });
  };
}
