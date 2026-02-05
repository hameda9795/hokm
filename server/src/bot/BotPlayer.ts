import { Card, Suit, Rank, Player, GameState, RANK_VALUES } from '../types/index.js';

/**
 * استراتژی‌های مختلف بازی
 */
type PlayStyle = 'aggressive' | 'defensive' | 'balanced';

/**
 * کلاس BotPlayer - هوش مصنوعی برای بازی حکم
 * این Bot قوانین بازی را رعایت می‌کند و هوشمندانه بازی می‌کند
 */
export class BotPlayer {
    private playStyle: PlayStyle;

    constructor(playStyle: PlayStyle = 'balanced') {
        this.playStyle = playStyle;
    }

    /**
     * انتخاب حکم توسط Bot
     * بررسی دست و انتخاب بهترین خال برای حکم
     */
    selectHokm(hand: Card[]): Suit {
        // شمارش کارت‌های هر خال
        const suitCounts: Record<Suit, { count: number; strength: number }> = {
            hearts: { count: 0, strength: 0 },
            diamonds: { count: 0, strength: 0 },
            clubs: { count: 0, strength: 0 },
            spades: { count: 0, strength: 0 }
        };

        for (const card of hand) {
            suitCounts[card.suit].count++;
            suitCounts[card.suit].strength += RANK_VALUES[card.rank];
        }

        // انتخاب خالی که بیشترین تعداد کارت قوی را دارد
        let bestSuit: Suit = 'spades';
        let bestScore = 0;

        for (const suit of Object.keys(suitCounts) as Suit[]) {
            const { count, strength } = suitCounts[suit];
            // امتیاز = تعداد × 10 + قدرت
            // تعداد مهم‌تر است چون حکم زیاد باعث کنترل بازی می‌شود
            const score = count * 15 + strength;

            if (score > bestScore) {
                bestScore = score;
                bestSuit = suit;
            }
        }

        return bestSuit;
    }

    /**
     * انتخاب کارت برای بازی
     * این تابع اصلی منطق هوشمند Bot است
     */
    selectCard(
        hand: Card[],
        gameState: GameState,
        playerId: string
    ): Card {
        const { currentTrick, hokm } = gameState;
        const leadSuit = currentTrick.leadSuit;
        const cardsPlayed = currentTrick.cards;

        // فیلتر کارت‌های مجاز
        const playableCards = this.getPlayableCards(hand, leadSuit);

        if (playableCards.length === 0) {
            // این نباید اتفاق بیفتد، ولی برای اطمینان
            return hand[0];
        }

        if (playableCards.length === 1) {
            // فقط یک انتخاب داریم
            return playableCards[0];
        }

        // اگر اولین نفر هستیم
        if (cardsPlayed.length === 0) {
            return this.selectLeadCard(hand, gameState);
        }

        // اگر نفر آخر هستیم (4 کارت)
        if (cardsPlayed.length === 3) {
            return this.selectLastCard(playableCards, cardsPlayed, leadSuit!, hokm!);
        }

        // نفرهای میانی
        return this.selectMiddleCard(playableCards, cardsPlayed, leadSuit!, hokm!, gameState, playerId);
    }

    /**
     * کارت‌های مجاز برای بازی
     */
    private getPlayableCards(hand: Card[], leadSuit: Suit | null): Card[] {
        if (!leadSuit) {
            // اگر اولین نفر هستیم، همه کارت‌ها مجاز است
            return hand;
        }

        // کارت‌های خال درخواستی
        const sameSuitCards = hand.filter(c => c.suit === leadSuit);

        if (sameSuitCards.length > 0) {
            return sameSuitCards;
        }

        // اگر خال درخواستی نداریم، همه کارت‌ها مجاز است
        return hand;
    }

    /**
     * انتخاب کارت برای شروع دست (Lead)
     */
    private selectLeadCard(hand: Card[], gameState: GameState): Card {
        const hokm = gameState.hokm!;

        // استراتژی: 
        // 1. اگر آس یا شاه قوی داریم، بزنیم تا trick ببریم
        // 2. اگر خال تک داریم، آن را خالی کنیم
        // 3. از خال غیر حکم شروع کنیم

        // گروه‌بندی بر اساس خال
        const suitGroups = this.groupBySuit(hand);

        // پیدا کردن خال‌های تک (singleton)
        const singletons = Object.entries(suitGroups)
            .filter(([suit, cards]) => cards.length === 1 && suit !== hokm)
            .map(([_, cards]) => cards[0]);

        // اگر تک داریم و کارت بزرگ نیست، خالی کنیم
        if (singletons.length > 0 && this.playStyle !== 'aggressive') {
            const weakSingleton = singletons.find(c => RANK_VALUES[c.rank] < 10);
            if (weakSingleton) return weakSingleton;
        }

        // پیدا کردن بالاترین کارت غیر حکم
        const nonHokmCards = hand.filter(c => c.suit !== hokm);
        if (nonHokmCards.length > 0) {
            // اگر آس داریم، بزنیم
            const aces = nonHokmCards.filter(c => c.rank === 'A');
            if (aces.length > 0) return aces[0];

            // اگر شاه داریم و آس آن خال رفته، بزنیم
            const kings = nonHokmCards.filter(c => c.rank === 'K');
            if (kings.length > 0 && this.playStyle === 'aggressive') {
                return kings[0];
            }

            // کارت متوسط بزنیم
            const sorted = [...nonHokmCards].sort((a, b) => RANK_VALUES[b.rank] - RANK_VALUES[a.rank]);
            // کارت وسطی
            return sorted[Math.floor(sorted.length / 2)];
        }

        // فقط حکم داریم - کوچک‌ترین حکم را بزنیم
        const sortedHokm = [...hand].sort((a, b) => RANK_VALUES[a.rank] - RANK_VALUES[b.rank]);
        return sortedHokm[0];
    }

    /**
     * انتخاب کارت وقتی نفر آخر هستیم
     * می‌دانیم چه کسی فعلاً برنده است
     */
    private selectLastCard(
        playableCards: Card[],
        cardsPlayed: { playerId: string; card: Card }[],
        leadSuit: Suit,
        hokm: Suit
    ): Card {
        // پیدا کردن کارت برنده فعلی
        const currentWinner = this.findCurrentWinner(cardsPlayed, leadSuit, hokm);
        const winningValue = this.getCardValue(currentWinner.card, leadSuit, hokm);

        // آیا می‌توانیم ببریم؟
        const winningCards = playableCards.filter(c =>
            this.getCardValue(c, leadSuit, hokm) > winningValue
        );

        if (winningCards.length > 0) {
            // با کوچک‌ترین کارت برنده شویم
            return this.getLowestCard(winningCards);
        }

        // نمی‌توانیم ببریم - کوچک‌ترین کارت را بدهیم
        return this.getLowestCard(playableCards);
    }

    /**
     * انتخاب کارت وقتی نفر دوم یا سوم هستیم
     */
    private selectMiddleCard(
        playableCards: Card[],
        cardsPlayed: { playerId: string; card: Card }[],
        leadSuit: Suit,
        hokm: Suit,
        gameState: GameState,
        playerId: string
    ): Card {
        const currentWinner = this.findCurrentWinner(cardsPlayed, leadSuit, hokm);
        const winningValue = this.getCardValue(currentWinner.card, leadSuit, hokm);

        // بررسی آیا برنده فعلی هم‌تیمی ماست
        const myPlayer = gameState.players.find(p => p.id === playerId);
        const winnerPlayer = gameState.players.find(p => p.id === currentWinner.playerId);
        const isTeamWinning = myPlayer?.team === winnerPlayer?.team;

        if (isTeamWinning) {
            // هم‌تیمی برنده است - کوچک‌ترین کارت را بدهیم
            return this.getLowestCard(playableCards);
        }

        // حریف برنده است - سعی کنیم ببریم
        const winningCards = playableCards.filter(c =>
            this.getCardValue(c, leadSuit, hokm) > winningValue
        );

        if (winningCards.length > 0) {
            // نفر دوم: با کارت قوی بزنیم که نفر بعدی نتواند ببرد
            // نفر سوم: با کوچک‌ترین کارت برنده شویم
            if (cardsPlayed.length === 1 && this.playStyle === 'aggressive') {
                return this.getHighestCard(winningCards);
            }
            return this.getLowestCard(winningCards);
        }

        // نمی‌توانیم ببریم
        // اگر خال درخواستی نداریم، آیا حکم بزنیم؟
        const hasLeadSuit = playableCards.some(c => c.suit === leadSuit);
        if (!hasLeadSuit) {
            const hokmCards = playableCards.filter(c => c.suit === hokm);

            if (hokmCards.length > 0 && cardsPlayed.length < 3) {
                // نفر دوم: اگر حریف lead زده، حکم بزنیم
                return this.getLowestCard(hokmCards);
            }
        }

        // کوچک‌ترین کارت را بدهیم
        return this.getLowestCard(playableCards);
    }

    /**
     * پیدا کردن برنده فعلی
     */
    private findCurrentWinner(
        cardsPlayed: { playerId: string; card: Card }[],
        leadSuit: Suit,
        hokm: Suit
    ): { playerId: string; card: Card } {
        let winner = cardsPlayed[0];
        let winningValue = this.getCardValue(winner.card, leadSuit, hokm);

        for (let i = 1; i < cardsPlayed.length; i++) {
            const value = this.getCardValue(cardsPlayed[i].card, leadSuit, hokm);
            if (value > winningValue) {
                winner = cardsPlayed[i];
                winningValue = value;
            }
        }

        return winner;
    }

    /**
     * محاسبه ارزش کارت در context فعلی
     */
    private getCardValue(card: Card, leadSuit: Suit, hokm: Suit): number {
        const baseValue = RANK_VALUES[card.rank];

        if (card.suit === hokm) {
            return 100 + baseValue; // حکم بالاترین ارزش
        }

        if (card.suit === leadSuit) {
            return baseValue; // خال درخواستی
        }

        return 0; // خال دیگر ارزشی ندارد
    }

    /**
     * کوچک‌ترین کارت
     */
    private getLowestCard(cards: Card[]): Card {
        return cards.reduce((lowest, card) =>
            RANK_VALUES[card.rank] < RANK_VALUES[lowest.rank] ? card : lowest
        );
    }

    /**
     * بزرگ‌ترین کارت
     */
    private getHighestCard(cards: Card[]): Card {
        return cards.reduce((highest, card) =>
            RANK_VALUES[card.rank] > RANK_VALUES[highest.rank] ? card : highest
        );
    }

    /**
     * گروه‌بندی کارت‌ها بر اساس خال
     */
    private groupBySuit(cards: Card[]): Record<Suit, Card[]> {
        const groups: Record<Suit, Card[]> = {
            hearts: [],
            diamonds: [],
            clubs: [],
            spades: []
        };

        for (const card of cards) {
            groups[card.suit].push(card);
        }

        return groups;
    }
}

// Singleton instance
export const botPlayer = new BotPlayer('balanced');
