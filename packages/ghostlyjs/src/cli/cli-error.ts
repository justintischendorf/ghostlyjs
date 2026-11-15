// A problem the user can fix, shown as a message instead of a stack trace.

export class CliError extends Error {
  // Whether to show the usage below the message (wrong arguments).
  showUsage: boolean;
  constructor(message: string, showUsage = false) {
    super(message);
    this.showUsage = showUsage;
  }
}
