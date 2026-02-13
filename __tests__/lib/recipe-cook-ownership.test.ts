import { canUserCookRecipe } from '@/lib/recipe-cook-ownership';

describe('recipe cook ownership', () => {
  it('allows cooking when requester owns recipe', () => {
    const result = canUserCookRecipe({
      recipeUserId: 'user-1',
      requesterUserId: 'user-1',
      hasLinkedNotification: false,
    });

    expect(result).toBe(true);
  });

  it('rejects cooking when requester does not own recipe', () => {
    const result = canUserCookRecipe({
      recipeUserId: 'user-1',
      requesterUserId: 'user-2',
      hasLinkedNotification: true,
    });

    expect(result).toBe(false);
  });

  it('allows cooking when recipe userId is null but linked notification exists', () => {
    const result = canUserCookRecipe({
      recipeUserId: null,
      requesterUserId: 'user-1',
      hasLinkedNotification: true,
    });

    expect(result).toBe(true);
  });

  it('rejects cooking when recipe userId is null and no linked notification exists', () => {
    const result = canUserCookRecipe({
      recipeUserId: null,
      requesterUserId: 'user-1',
      hasLinkedNotification: false,
    });

    expect(result).toBe(false);
  });
});
