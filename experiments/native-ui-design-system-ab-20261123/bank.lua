local list, root

function OnStart()
    root = script.object
    list = {}
    for _, row in ipairs(root:GetChild('buttons'):GetChildren()) do
        for _, button in ipairs(row:GetChildren()) do
            list[#list+1] = button
            button:AddCursorEventListener(Enum.CursorEventType.CursorClick, function()
                print('BANK_CLICK',button.name)
            end)
        end
    end
    root:AddKeyEventListener(Enum.KeyEventType.KeyboardCraftspersonKey10Down, function()
        for _, button in ipairs(list) do button.interactable = not button.interactable end
        return true
    end)
end
