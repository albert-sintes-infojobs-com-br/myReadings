import { IconButton, Tooltip } from '@mui/material';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';

interface RowActionButtonProps {
  onClick: () => void;
  disabled?: boolean;
}

/** Icono "Editar" ghost, coherente con la paleta de la landing (hover índigo) + tooltip. */
export function EditButton({ onClick, disabled }: RowActionButtonProps) {
  return (
    <Tooltip title="Editar">
      <span>
        <IconButton
          size="small"
          onClick={onClick}
          disabled={disabled}
          aria-label="Editar"
          sx={{
            borderRadius: 2,
            color: '#64748b',
            '&:hover': { bgcolor: '#eef2ff', color: '#4338ca' },
          }}
        >
          <EditOutlinedIcon fontSize="small" />
        </IconButton>
      </span>
    </Tooltip>
  );
}

/** Icono "Eliminar" ghost, coherente con la paleta de la landing (hover rosa) + tooltip. */
export function DeleteButton({ onClick, disabled }: RowActionButtonProps) {
  return (
    <Tooltip title="Eliminar">
      <span>
        <IconButton
          size="small"
          onClick={onClick}
          disabled={disabled}
          aria-label="Eliminar"
          sx={{
            borderRadius: 2,
            color: '#64748b',
            '&:hover': { bgcolor: '#fff1f2', color: '#e11d48' },
          }}
        >
          <DeleteOutlineIcon fontSize="small" />
        </IconButton>
      </span>
    </Tooltip>
  );
}
