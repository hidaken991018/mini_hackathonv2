type CookOwnershipCheckInput = {
  recipeUserId: string | null | undefined;
  requesterUserId: string;
  hasLinkedNotification: boolean;
};

export const canUserCookRecipe = ({
  recipeUserId,
  requesterUserId,
  hasLinkedNotification,
}: CookOwnershipCheckInput): boolean => {
  if (recipeUserId) {
    return recipeUserId === requesterUserId;
  }

  return hasLinkedNotification;
};
