export function createPageUrl(pageName: string) {
    return '/' + pageName;
}

export function cleanLockerNumber(lockerNumber: string | number | null | undefined): string {
    if (lockerNumber === null || lockerNumber === undefined) return "";
    return String(lockerNumber).replace(/['"''‚„]/g, '').trim();
}
