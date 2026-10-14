# How React Hook Form works (PDL)

A simplified description of React Hook Form v7's internals: a long-lived **control object** that holds all state outside React, **observer subjects** that broadcast changes, and a **Proxy** that decides which changes are worth a re-render.

## 1. Form initialization (`useForm`)

```
MODULE useForm(options)
  ON FIRST RENDER ONLY (stored in useRef, survives re-renders):
    CREATE control object:
      _fields          := empty registry
      _defaultValues   := options.defaultValues
      _formValues      := deep copy of _defaultValues
      _formState       := { errors: {}, dirtyFields: {}, touchedFields: {},
                            isDirty: false, isValid: false, isSubmitting: false,
                            submitCount: 0, ... }
      _proxyFormState  := all flags FALSE
      _subjects        := { state, array, values }
      _names           := { mount, unMount, array, watch }

  CREATE local React state: formState (used ONLY to force re-renders)

  AFTER FIRST COMMIT (useEffect), SUBSCRIBE to control._subjects.state:
    ON emitted update:
      IF shouldRenderFormState(update, control._proxyFormState) THEN
        call setState to trigger re-render
      ENDIF
  ON UNMOUNT: unsubscribe

  RETURN { register, handleSubmit, watch, setValue, reset, control,
           formState: createProxy(control._formState, control._proxyFormState) }
END MODULE
```

## 2. Field registration (`register`)

```
MODULE register(name, rules)
  ADD name to control._names.mount
  STORE rules in control._fields[name]

  RETURN props object:
    name     := name
    ref      := FUNCTION(domElement)
                  IF domElement exists THEN
                    control._fields[name].ref := domElement
                    SET domElement.value := get(control._formValues, name)
                  ELSE
                    IF options.shouldUnregister THEN remove value and field
                    ELSE keep value in _formValues
                  ENDIF
    onChange := handleChange
    onBlur   := handleChange
END MODULE
```

The input stays **uncontrolled**. React never sets its `value` prop. The DOM holds the value, and RHF only gets a ref to it.

## 3. Change and blur handling

```
MODULE handleChange(event)
  name   := event.target.name
  value  := read value from event.target (handles checkbox, radio, file, number)
  isBlur := event.type is "blur"

  SET control._formValues[name] := value

  IF isBlur THEN mark touchedFields[name] := TRUE
  dirty := value is NOT deepEqual to _defaultValues[name]
  UPDATE dirtyFields[name], recompute isDirty

  NOTIFY control._subjects.values WITH { name, value }

  IF shouldValidateNow(mode, reValidateMode, isBlur, isSubmitted, hasError(name)) THEN
    error := CALL validate(name)
    UPDATE control._formState.errors[name] := error
  ENDIF

  NOTIFY control._subjects.state WITH { name, changed flags }
END MODULE
```

Setting the value is a plain mutation with no `setState`. A re-render happens only if a component read one of the changed flags.

## 4. Deciding when to validate

```
FUNCTION shouldValidateNow(mode, reValidateMode, isBlur, isSubmitted, fieldHasError)
  IF NOT isSubmitted THEN
    CASE mode OF
      "onSubmit":  RETURN FALSE
      "onBlur":    RETURN isBlur
      "onChange":  RETURN NOT isBlur
      "onTouched": RETURN isBlur OR field already touched
      "all":       RETURN TRUE
    ENDCASE
  ELSE
    RETURN reValidateMode matches event type
  ENDIF
END FUNCTION
```

Before the first submit, `mode` decides. After it, `reValidateMode` decides (default `"onChange"`).

## 5. Validation

```
MODULE validate(nameOrAll)
  IF options.resolver exists THEN
    result := CALL resolver(control._formValues, context, fieldOptions)
    RETURN result.errors (filtered to nameOrAll)
  ELSE
    FOR EACH field IN nameOrAll
      FOR EACH rule IN [required, min, max, minLength, maxLength, pattern, validate]
        IF rule fails THEN
          RECORD error { type: rule, message }
          IF criteriaMode is "firstError" THEN BREAK
        ENDIF
      ENDFOR
    ENDFOR
    RETURN collected errors
  ENDIF
END MODULE
```

The resolver branch covers Zod, Yup, Valibot, and similar libraries. The other branch uses the built-in rules passed to `register()`.

## 6. The formState Proxy (selective re-rendering)

```
MODULE createProxy(formState, proxyFlags)
  RETURN Proxy over formState WITH:
    ON property read (e.g. formState.errors, formState.isDirty):
      SET proxyFlags[property] := TRUE
      RETURN formState[property]
END MODULE

FUNCTION shouldRenderFormState(update, proxyFlags)
  FOR EACH key IN update
    IF proxyFlags[key] is TRUE AND value actually changed THEN RETURN TRUE
  ENDFOR
  RETURN FALSE
END FUNCTION
```

This is why destructuring `formState` matters. If you never read `isDirty`, dirty changes never re-render your component.

## 7. Submission (`handleSubmit`)

```
MODULE handleSubmit(onValid, onInvalid)
  RETURN async FUNCTION(event)
    event.preventDefault()
    SET isSubmitting := TRUE; NOTIFY state

    errors := CALL validate(ALL fields)

    IF errors is empty THEN
      AWAIT onValid(copy of control._formValues, event)
      SET isSubmitSuccessful := TRUE
    ELSE
      CALL onInvalid(errors) IF provided
      IF shouldFocusError THEN focus ref of first field with error
    ENDIF

    SET isSubmitting := FALSE, isSubmitted := TRUE, submitCount += 1
    NOTIFY state
  END FUNCTION
END MODULE
```

## 8. Watching values

```
MODULE watch(name)
  ADD name to control._names.watch
  RETURN get(control._formValues, name)
END MODULE

MODULE useWatch({ control, name })
  local state := current value of name
  SUBSCRIBE to control._subjects.values:
    IF emitted name matches name THEN setState(new value)
  RETURN local state
END MODULE
```

`watch` is called on the `useForm` host, so the **whole form** re-renders whenever a watched value changes. `useWatch` is isolated: only the component that calls it re-renders.

## 9. Controlled components (`Controller` / `useController`)

```
MODULE useController({ name, control, rules })
  CALL control.register(name, rules)
  value := useWatch(name)

  RETURN field props:
    value    := value
    onChange := FUNCTION(newValue)
                  CALL control's change handler WITH synthetic { name, value: newValue }
    onBlur   := mark touched, maybe validate
    ref      := used only for focus-on-error
END MODULE
```

`useController` uses the same registry as native inputs, but React owns the value here, so these fields are controlled. This is the bridge for MUI, date pickers, and similar components. Re-renders stay scoped to that one controller.

## 10. Dynamic lists (`useFieldArray`)

```
MODULE useFieldArray({ control, name })
  ADD name to control._names.array
  fields := map current array to items, each with a generated stable `id`

  DEFINE append(item), remove(i), insert(i, item), move(a, b), swap(a, b), update(i, item):
    APPLY the same operation in parallel to:
      _formValues[name], _fields, errors[name], touchedFields[name], dirtyFields[name]
    REGENERATE ids for affected items
    NOTIFY control._subjects.array AND state

  RETURN { fields, append, remove, insert, move, swap, update }
END MODULE
```

Use `field.id` as the React key, never the index.

## Summary

Values live in `_formValues` and the DOM, not in React state. Every change goes through a central handler that mutates the control object and broadcasts on observer subjects. React re-renders only when a subscriber depends on what changed, whether that's the Proxy-tracked `formState`, `useWatch`, or a `Controller`.