export async function notifySlack(text) {
  if (!process.env.EPB_TEAM_SLACK_URL || !process.env.STAGE) {
    return;
  }
  try {
    await fetch(process.env.EPB_TEAM_SLACK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: `[${process.env.STAGE}] ${text}`,
      }),
    });
  } catch (e) {
    console.error(e);
  }
}
