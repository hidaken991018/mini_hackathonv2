import { fireEvent, render, screen } from '@testing-library/react';
import IngredientInput, { IngredientFormItem } from '@/components/IngredientInput';

describe('IngredientInput', () => {
  const ingredients: IngredientFormItem[] = [
    { name: '鶏肉', quantityValue: '300', quantityUnit: '' },
  ];

  it('単位をプルダウンから選択するとonChangeに反映される', () => {
    const onChange = jest.fn();

    render(<IngredientInput ingredients={ingredients} onChange={onChange} />);

    const unitInput = screen.getByPlaceholderText('単位');
    fireEvent.focus(unitInput);
    fireEvent.mouseDown(screen.getByText('g'));

    expect(onChange).toHaveBeenCalled();
    const latest = onChange.mock.calls[onChange.mock.calls.length - 1][0];
    expect(latest[0].quantityUnit).toBe('g');
  });

  it('レシピ向け単位候補（計量・目安）が表示される', () => {
    const onChange = jest.fn();

    render(<IngredientInput ingredients={ingredients} onChange={onChange} />);

    const unitInput = screen.getByPlaceholderText('単位');
    fireEvent.focus(unitInput);

    expect(screen.getByText('大さじ')).toBeInTheDocument();
    expect(screen.getByText('適量')).toBeInTheDocument();
    expect(screen.getByText('缶')).toBeInTheDocument();
  });
});
